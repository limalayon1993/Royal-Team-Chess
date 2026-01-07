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
        // Assuming seasonId is YYYY-MM
        let [year, month] = seasonId.split('-').map(Number);
        let nextMonth = month + 1;
        let nextYear = year;
        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear++;
        }
        const nextSeasonId = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
        console.log(`[LeagueManager] Next Season: ${nextSeasonId}`);

        // 2. Scan ALL Clubs Division by Division (1 to 6)
        const activeDivisions = [];
        for (let i = 1; i <= 6; i++) {
            const standings = await db.getLeagueStandings(seasonId, i);
            if (standings && standings.length > 0) {
                activeDivisions.push({ division: i, standings });
            }
        }

        const PROMOTION_COUNT = 3;
        const RELEGATION_COUNT = 3;
        const DIVISION_CAPACITY = 20;

        // Track clubs processed to avoid duplicates (shouldn't happen with clean data)
        const processedClubIds = new Set();
        let clubsToRelegateFromBottom = [];

        for (const divData of activeDivisions) {
            const { division, standings } = divData;
            console.log(`[LeagueManager] Processing Div ${division} (${standings.length} clubs)`);

            // Award Trophies (Top 3 Div 1)
            if (division === 1) {
                if (standings[0]) await this.awardTrophy(standings[0], seasonId, division, 'gold');
                if (standings[1]) await this.awardTrophy(standings[1], seasonId, division, 'silver');
                if (standings[2]) await this.awardTrophy(standings[2], seasonId, division, 'bronze');
            }

            // Determine Movement
            // Top 3 -> Promote (Div - 1)
            // Bottom 3 -> Relegate (Div + 1 or Pool)
            // Rest -> Stay

            // Indices for P/R
            const promoteCutoff = PROMOTION_COUNT;
            const relegateCutoff = standings.length - RELEGATION_COUNT; // Careful if length < 6

            for (let i = 0; i < standings.length; i++) {
                const club = standings[i];
                let nextDivision = division; // Default: Stay

                // Promotion Logic
                if (division > 1 && i < promoteCutoff) {
                    nextDivision = division - 1;
                    console.log(`[P/R] Club ${club.club.name} promotes to Div ${nextDivision}`);
                }
                // Relegation Logic
                else if (i >= relegateCutoff && standings.length >= (PROMOTION_COUNT + RELEGATION_COUNT)) {
                    // Only relegate if we have enough teams to justify it? Or always?
                    // Standard rules: Bottom 3 always drop if there is a place below.

                    // Does next division exist?
                    // We check if we are at the "Bottom Active".
                    // For simply logic: we set them to division + 1.
                    // If division + 1 is > Max (e.g. 7), they go to Pool (0).
                    const tentativeNext = division + 1;
                    if (tentativeNext > 6) {
                        nextDivision = 0; // Pool
                    } else {
                        nextDivision = tentativeNext;
                    }
                    console.log(`[P/R] Club ${club.club.name} relegates to Div ${nextDivision}`);

                    // Special handling for bottom-most active division logic handled in 'Expansion' block?
                    // To keep it simple: Just always push down. The expansion logic handles "filling" empty divs.
                    // But wait, if Div 2 is empty, we Relegate from Div 1 to create Div 2.
                    // So simplistic assignment is fine.
                }

                // APPLY UPDATES
                // 1. Update Persistent Division
                await db.updateClubDivision(club.club_id, nextDivision);

                // 2. Initialize Stats for NEXT Season
                await db.initializeClubStats(club.club_id, nextSeasonId, nextDivision);

                processedClubIds.add(club.club_id);
            }
        }

        // 3. Handle Pool (Div 0)
        // We need to check if any Pool clubs fill empty spots or if we need to expand.
        // For MVP: Just initialize Pool clubs for next season so they don't disappear.
        // If we want actual promotion from Pool, we need to pick Top N pool clubs and move them to Lowest Active + 1?

        // Let's just initialize ALL remaining active clubs (Pool) that weren't processed.
        // We can scan 'clubs' table for anyone we missed?
        // Or query Div 0 standings.
        const poolStandings = await db.getLeagueStandings(seasonId, 0);
        if (poolStandings) {
            for (const club of poolStandings) {
                if (!processedClubIds.has(club.club_id)) {
                    // Ensure they stay in Pool (0)
                    await db.initializeClubStats(club.club_id, nextSeasonId, 0);
                    processedClubIds.add(club.club_id);
                }
            }
        }

        console.log(`[LeagueManager] Processed ${processedClubIds.size} clubs for transition to ${nextSeasonId}`);
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
