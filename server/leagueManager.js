const db = require('./db');
const { getLeagueStandings, updateClubDivision, awardClubTrophy } = require('./db');

class LeagueManager {
    constructor() {
        console.log('[LeagueManager] Initialized v2 (6 Divisions + Pool)');
    }

    /**
     * Process Season End
     * - Handles Divisions 1 to 6.
     * - Handles Promotion/Relegation between active stats.
     * - Handles Expansion from Pool (Div 0) -> New Division.
     * - Awards Trophies.
     */
    async processSeasonEnd(seasonId) {
        console.log(`[LeagueManager] Processing Season End for ${seasonId}`);

        // 1. Calculate NEXT Season ID
        let [year, month] = seasonId.split('-').map(Number);
        let nextMonth = month + 1;
        let nextYear = year;
        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear++;
        }
        const nextSeasonId = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
        console.log(`[LeagueManager] Next Season: ${nextSeasonId}`);

        // 2. Fetch ALL Standings first (Snapshot)
        // We fetch Div 0 to 6.
        const allStandings = {}; // Map<Division, Array<ClubStats>>
        for (let i = 0; i <= 6; i++) {
            const s = await db.getLeagueStandings(seasonId, i);
            allStandings[i] = s || [];
        }

        const PROMOTION_COUNT = 3;
        const DIVISION_CAPACITY = 20;

        const moves = []; // Array<{ clubId, targetDiv }>

        // 3. Logic: Waterfall (1 -> 6)
        // We determine moves based on the state at the END of the season.
        for (let div = 1; div <= 6; div++) {
            const currentClubs = allStandings[div];
            const lowerDiv = div === 6 ? 0 : div + 1; // Pool is 0, but acts as feeder for 6
            // Wait, if div=6, lower is 0 (Pool).
            // Logic: Feeder is ALWAYS the level below.
            // But Div 7 doesn't exist, so Div 6 feeds from Pool logic?
            // Yes, let's treat Pool as "Below 6".

            // Correction: Pool is Div 0 in DB.
            // Let's explicitly map feeders:
            // 1 <- 2
            // 2 <- 3
            // ...
            // 6 <- 0 (Pool) ? Or 6 <- 7 (Empty) and Pool is separate?
            // User implies Pool feeds the system.
            // Let's assume Pool feeds Div 6.

            const feederClubs = (div === 6) ? allStandings[0] : allStandings[div + 1];

            console.log(`[LeagueManager] Logic Div ${div}: Current ${currentClubs.length}, Feeder (Div ${div === 6 ? 0 : div + 1}) ${feederClubs.length}`);

            // 1. Identify Promoting Clubs (Top 3 from Feeder)
            const numPromoting = Math.min(feederClubs.length, PROMOTION_COUNT);
            const promoting = feederClubs.slice(0, numPromoting);

            // 2. Identify Relegating Clubs (Adaptive)
            // Goal: Target 20.
            // Virtual Count = Current + IncomingPromotions.
            // If > 20, we must shed the excess.
            const virtualCount = currentClubs.length + numPromoting;
            const excess = virtualCount - DIVISION_CAPACITY;

            let relegating = [];
            if (excess > 0) {
                // Relegate the bottom 'excess' clubs
                // Note: currentClubs is sorted Descending (Best to Worst).
                // So bottom are at the end.
                const numRelegating = excess;
                const startIndex = currentClubs.length - numRelegating;
                if (startIndex >= 0) {
                    relegating = currentClubs.slice(startIndex);
                }
            }

            console.log(`   -> Promoting ${promoting.length} from below.`);
            console.log(`   -> Relegating ${relegating.length} to below (Excess: ${excess}).`);

            // 3. Queue Moves

            // Promote: Feeder -> Div
            for (const c of promoting) {
                // Ensure we haven't already moved this club (Unlikely in waterfall if distinct sets)
                moves.push({ clubId: c.club_id, targetDiv: div, name: c.club.name, type: 'PROMOTION' });
            }

            // Relegate: Current -> Lower
            // If Div 6 relegates, they go to Pool (0)
            const targetForRelegation = (div === 6) ? 0 : div + 1;
            for (const c of relegating) {
                moves.push({ clubId: c.club_id, targetDiv: targetForRelegation, name: c.club.name, type: 'RELEGATION' });
            }

            // Award Trophies (Div 1 only, from snapshot)
            if (div === 1) {
                if (currentClubs[0]) await this.awardTrophy(currentClubs[0], seasonId, 1, 'gold');
                if (currentClubs[1]) await this.awardTrophy(currentClubs[1], seasonId, 1, 'silver');
                if (currentClubs[2]) await this.awardTrophy(currentClubs[2], seasonId, 1, 'bronze');
            }
        }

        // 4. Apply Moves
        const processedIds = new Set();

        for (const m of moves) {
            console.log(`[LeagueManager] Execute: ${m.type} ${m.name} -> Div ${m.targetDiv}`);
            await db.updateClubDivision(m.clubId, m.targetDiv);
            await db.initializeClubStats(m.clubId, nextSeasonId, m.targetDiv);
            processedIds.add(m.clubId);
        }

        // 5. Initialize STAYING Clubs
        // Anyone not in 'moves' stays in their current division (or pool).
        for (let div = 0; div <= 6; div++) {
            const clubs = allStandings[div];
            for (const c of clubs) {
                if (!processedIds.has(c.club_id)) {
                    // Stays
                    const targetDiv = c.division; // Should match div, unless inconsistent DB
                    // Note: If C was in Div 2, and wasn't promoted or relegated, it stays in Div 2.
                    // Important: Pool clubs (Div 0) that didn't promote to Div 6 stay in Pool.

                    await db.initializeClubStats(c.club_id, nextSeasonId, targetDiv);
                }
            }
        }

        console.log(`[LeagueManager] Season ${seasonId} processing complete.`);
    }

    async awardTrophy(standingRow, seasonId, division, type) {
        console.log(`[LeagueManager] Awarding ${type} trophy to ${standingRow.club.name}`);

        // 1. Identify Trophy Name based on context
        let trophyName = null;
        if (division === 1 && type === 'gold') {
            trophyName = 'Campeón de Primera División';
        }

        if (!trophyName) {
            console.log(`[LeagueManager] No trophy definition found for Div ${division} ${type}`);
            return;
        }

        // 2. Get Trophy Definition ID
        const trophyDef = await db.getTrophyByName(trophyName);
        if (!trophyDef) {
            console.error(`[LeagueManager] Trophy definition '${trophyName}' not found in DB!`);
            return;
        }

        // 3. Award IT
        await db.awardClubTrophy(standingRow.club_id, trophyDef.id, seasonId);
    }
}

module.exports = new LeagueManager();
