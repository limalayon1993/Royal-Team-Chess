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
        // Corrected for Net Flow: Virtual = Start - Moved_Up + Relegated_In + Promoted_In

        // We need to track who moved OUT in the previous step (from Div-1 calculation)
        // And who moved IN (Relegated from Div-1)

        let sentUpCount = 0; // Number of clubs from 'current div' that promoted to 'div-1' (Calculated in PREVIOUS loop, confusing?)
        // Actually, we calculate promotions FROM 'feeder' (div+1) TO 'current' (div).
        // So for Div 1: Feeder is Div 2. We verify Promos D2->D1.

        // Loop strategy:
        // We iterate 1 to 6.
        // At Div X:
        // 1. We know 'Relegated_In' from Div X-1 (calculated in previous iteration).
        // 2. We calculate 'Promoted_In' from Div X+1 (Feeder).
        // 3. We determine 'Promoted_Out' from Div X to Div X-1? 
        //    WAIT. Div X promotions to Div X-1 were calculated in the Div X-1 loop!
        //    So we ALREADY know how many left Div X to go up!

        // State tracking object
        const changes = {
            // division: { promotedOut: N, relegatedIn: N }
        };
        for (let d = 1; d <= 6; d++) changes[d] = { promotedOut: 0, relegatedIn: 0 };

        // We need to run this sequentially and update 'changes' for the NEXT loop (or previous/related).

        // Refined Loop:
        // Div 1 Loop:
        //   - Promoted_In (from D2).
        //   - Relegated_In (from D0? None).
        //   - Promoted_Out (to D0? None).
        //   -> Calculate Overflow (Relegated_Out -> D2).
        //   -> Update D2's "Relegated_In".
        //   -> Also, we just calculated D2->D1 promotions. So update D2's "Promoted_Out".

        for (let div = 1; div <= 6; div++) {
            const currentClubs = allStandings[div];

            // Feeder (Div Below)
            const feederDivId = div === 6 ? 0 : div + 1;
            const feederClubs = (div === 6) ? allStandings[0] : allStandings[div + 1];

            console.log(`[LeagueManager] Logic Div ${div}. Start Size: ${currentClubs.length}`);

            // 1. INCOMING (UP): Calculate Promotions from Below (Feeder -> Div)
            // Note: This logic belongs to 'div'. We decide who we accept.
            const numPromoting = Math.min(feederClubs.length, PROMOTION_COUNT);
            const promoting = feederClubs.slice(0, numPromoting);

            // Record these as "Promoted Out" for the Feeder layer (for next iteration)
            if (div < 6) {
                changes[div + 1].promotedOut = numPromoting;
            }

            // 2. INCOMING (DOWN): Already recorded in 'changes[div].relegatedIn' from previous loop
            const relegatedIn = changes[div].relegatedIn;

            // 3. OUTGOING (UP): Already recorded in 'changes[div].promotedOut' from previous loop (when we processed div-1)
            const promotedOut = changes[div].promotedOut;

            // 4. CALCULATE VIRTUAL COUNT
            // Virtual = Start - Up + Down(In) + Up(In)
            const virtualCount = currentClubs.length - promotedOut + relegatedIn + numPromoting;

            const excess = virtualCount - DIVISION_CAPACITY;

            console.log(`   Flow: -${promotedOut} (Up) +${relegatedIn} (DownIn) +${numPromoting} (UpIn) = Net ${virtualCount}`);

            let relegating = [];
            if (excess > 0) {
                // We relegate the bottom 'excess' clubs
                // We must exclude clubs that already promoted out!
                // 'currentClubs' contains everyone.
                // Promoting out are Top N. Relegating are Bottom N. They don't overlap usually.

                const numRelegating = excess;

                // Safety check: Don't relegate more than (Start - PromotedOut)
                // If we try to relegate everyone remaining, that's fine.

                const availableToRelegate = currentClubs.length - promotedOut; // These are the bottom part
                const actualRelegating = Math.min(numRelegating, availableToRelegate);

                const startIndex = currentClubs.length - actualRelegating;
                if (startIndex >= 0) {
                    relegating = currentClubs.slice(startIndex);
                }

                // Update 'relegatedIn' for the division below
                if (div < 6) {
                    changes[div + 1].relegatedIn = relegating.length;
                }
            }

            console.log(`   -> Relegating ${relegating.length} to below.`);

            // QUEUE MOVES
            // Promote: Feeder -> Div
            for (const c of promoting) {
                moves.push({ clubId: c.club_id, targetDiv: div, name: c.club.name, type: 'PROMOTION' });
            }

            // Relegate: Current -> Lower
            const targetForRelegation = (div === 6) ? 0 : div + 1;
            for (const c of relegating) {
                moves.push({ clubId: c.club_id, targetDiv: targetForRelegation, name: c.club.name, type: 'RELEGATION' });
            }

            // Award Trophies
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
