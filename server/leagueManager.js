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

        // 1. Identify MAX active division
        // We scan divisions 1 to 6.
        const activeDivisions = [];
        for (let i = 1; i <= 6; i++) {
            const standings = await db.getLeagueStandings(seasonId, i);
            if (standings && standings.length > 0) {
                activeDivisions.push({ division: i, standings });
            }
        }

        console.log(`[LeagueManager] Active Divisions found: ${activeDivisions.map(d => d.division).join(', ')}`);

        if (activeDivisions.length === 0) {
            console.log('[LeagueManager] No active divisions. Checking Pool for first generation?');
            // If completely empty, we might need to seed Div 1 from Pool?
            // Assuming this runs on existing system, we process Pool later.
        }

        // 2. Process Standard Internal P/R (Div 1 to MaxActive)
        // We iterate from Div 1 downwards.
        // Rules:
        // Div 1: Bottom 3 Relegate -> Div 2 (if exists) or Pool.
        // Div X (X>1): Top 3 Promote -> Div X-1. Bottom 3 Relegate -> Div X+1 (if exists) or Pool.

        const PROMOTION_COUNT = 3;
        const RELEGATION_COUNT = 3;
        const DIVISION_CAPACITY = 20;
        const MAX_DIVISIONS = 6;

        let clubsToRelegateToPool = []; // Clubs falling out of the bottom-most active division

        // A. Award Trophies & Identify Movers
        for (const divData of activeDivisions) {
            const { division, standings } = divData;

            // Trophies (Top 3)
            if (division === 1) { // Only Div 1 gets Gold/Silver/Bronze titles? User didn't specify, but implies Div 1 is top.
                if (standings[0]) await this.awardTrophy(standings[0], seasonId, division, 'gold');
                if (standings[1]) await this.awardTrophy(standings[1], seasonId, division, 'silver');
                if (standings[2]) await this.awardTrophy(standings[2], seasonId, division, 'bronze');
            } else {
                // For lower divisions, maybe just "Winner" trophy? Skipping for now to keep simple.
            }

            // Promotions (if Div > 1)
            if (division > 1) {
                const top3 = standings.slice(0, PROMOTION_COUNT);
                for (const club of top3) {
                    console.log(`[LeagueManager] Promoting Club ${club.club.name} (${club.club_id}) to Div ${division - 1}`);
                    await db.updateClubDivision(club.club_id, division - 1);
                }
            }

            // Relegations
            // If next division exists, they go there. If not (this is the bottom active), they go to Pool TEMPORARILY
            // pending expansion check.
            const bottom3 = standings.slice(-RELEGATION_COUNT);
            const nextDivIndex = activeDivisions.findIndex(d => d.division === division + 1);

            if (nextDivIndex !== -1) {
                // Next division exists interactively
                for (const club of bottom3) {
                    console.log(`[LeagueManager] Relegating Club ${club.club.name} (${club.club_id}) to Div ${division + 1}`);
                    await db.updateClubDivision(club.club_id, division + 1);
                }
            } else {
                // This is the formatted "Bottom Active Division".
                // These clubs fall into the abyss (Pool) OR into a new division if created.
                // We track them.
                clubsToRelegateToPool = bottom3;
            }
        }

        // 3. Pool & Expansion Logic
        // The "Bottom 3" of the lowest active division have effectively been "kicked out".
        // Now we look at the Pool (Div 0).
        // Plus our freshly relegated friends (who have Prio 1).

        const poolClubsRaw = await db.getLeagueStandings(seasonId, 0); // Get pool based on PAST season stats?
        // Actually, db.getLeagueStandings queries 'club_seasonal_stats'.
        // New clubs might not have stats for 'this' closing season?
        // Wait, 'createClub' initializes stats for CURRENT season.
        // So yes, they should be in the stats table for 'seasonId'.

        // We need a list of ALL candidate clubs for the next tier (or filling holes).
        // Since we are strictly doing "Create New Division" logic:
        // We only care about creating Div N+1 if we have enough clubs.

        const lastActiveDiv = activeDivisions.length > 0 ? activeDivisions[activeDivisions.length - 1].division : 0;
        const nextTargetDiv = lastActiveDiv + 1;

        if (nextTargetDiv > MAX_DIVISIONS) {
            console.log('[LeagueManager] Max divisions reached. Relegating bottom to Pool.');
            for (const club of clubsToRelegateToPool) {
                await db.updateClubDivision(club.club_id, 0);
            }
            return;
        }

        // Candidates for New Division (or filling the void):
        // 1. Relegated from Last Div (Priority 1)
        // 2. Pool Clubs (Priority 2)

        const relegatedIds = new Set(clubsToRelegateToPool.map(c => c.club_id));
        const poolClubs = poolClubsRaw || [];

        // Total available for the new frontier
        const totalCandidates = clubsToRelegateToPool.length + poolClubs.length;

        console.log(`[LeagueManager] Expansion Check: Target Div ${nextTargetDiv}. Candidates: ${totalCandidates} (Relegated: ${clubsToRelegateToPool.length}, Pool: ${poolClubs.length})`);

        if (totalCandidates >= DIVISION_CAPACITY) {
            console.log(`[LeagueManager] Enough clubs to form Division ${nextTargetDiv}. Executing Expansion.`);

            // 1. Move Relegated clubs to New Div (instead of Pool)
            for (const club of clubsToRelegateToPool) {
                console.log(`[LeagueManager] Placing Relegated Club ${club.club.name} into NEW Div ${nextTargetDiv}`);
                await db.updateClubDivision(club.club_id, nextTargetDiv);
            }

            // 2. Fill remainder from Pool (Top Elo/Points)
            // Pool sort: Points DESC, then Elo DESC (if available in view? mock logic for now)
            // assuming poolClubs is sorted by points by getLeagueStandings.
            const slotsRemaining = DIVISION_CAPACITY - clubsToRelegateToPool.length;
            const promotedFromPool = poolClubs.slice(0, slotsRemaining);

            for (const club of promotedFromPool) {
                console.log(`[LeagueManager] Promoting Pool Club ${club.club.name} into NEW Div ${nextTargetDiv}`);
                await db.updateClubDivision(club.club_id, nextTargetDiv);
            }

            // Remaining pool stays in pool (Div 0)
        } else {
            console.log(`[LeagueManager] Not enough clubs (${totalCandidates}/${DIVISION_CAPACITY}) to form Division ${nextTargetDiv}.`);
            // Relegated clubs go to Pool
            for (const club of clubsToRelegateToPool) {
                console.log(`[LeagueManager] Relegating Club ${club.club.name} to Pool (Div 0)`);
                await db.updateClubDivision(club.club_id, 0);
            }

            // Pool clubs stay in Pool.
            // But wait! "Top 3 of Pool ascend to that division" (if it existed).
            // Logic says: "Bottom 3 of Div 1 descend... Top 3 of Pool ascend".
            // If Division 2 doesn't exist, we just did the expansion check above.
            // If expansion failed, the Bottom 3 joined the pool.
            // BUT, if we have a "Vacancy" in the lowest division (moved up?), we might need to fill it?
            // Actually, standard P/R handles the flow BETWEEN divisions.
            // The lowest division "exchanges" with the pool?
            // "If we have only 1 division... Bottom 3 go to pool, Top 3 from pool ascend."

            // CORRECT LOGIC REVISION for "No Expansion" case:
            // If LastDiv is NOT full/expanding, it acts as the interface to Pool.
            // Swap logic:
            // We already identified `clubsToRelegateToPool` as the bottom 3.
            // We need to identifying the Top 3 FROM POOL to replace them in `lastActiveDiv`.

            // Wait, createClub doesn't auto-fill divisions.
            // So `lastActiveDiv` might have openings?
            // Assuming standard 20.

            // "Swapping": The 3 we just "relegated" (intending for next tier) actually go to Pool.
            // AND the Top 3 of Pool take their place in `lastActiveDiv`.

            // We effectively just moved the bottom 3 to Div 0.
            // Now move Top 3 Div 0 to `lastActiveDiv`.

            const bestPoolClubs = poolClubs.slice(0, RELEGATION_COUNT);
            for (const club of bestPoolClubs) {
                // Check if they are already in the list to be relegated? (Edge case if pool is tiny/same)
                // Unlikely given IDs.
                console.log(`[LeagueManager] Promotion from Pool! Club ${club.club.name} to Div ${lastActiveDiv}`);
                await db.updateClubDivision(club.club_id, lastActiveDiv);
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
