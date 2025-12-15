const db = require('../db');

async function test() {
    console.log('--- STARTING VERIFICATION ---');

    console.log('1. Testing getLeagueStandings(currentSeason, 1)...');
    const now = new Date();
    const seasonId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    try {
        const standings = await db.getLeagueStandings(seasonId, 1);
        console.log(`Standings Count: ${standings.length}`);
        if (standings.length > 0) {
            console.log('Sample Row Keys:', Object.keys(standings[0]));
            if (standings[0].matches_played !== undefined) {
                console.log('PASS: matches_played found');
            } else {
                console.error('FAIL: matches_played NOT found');
            }
        } else {
            console.log('WARN: No standings found, cannot verify keys.');
        }
    } catch (e) {
        console.error('FAIL: getLeagueStandings error:', e);
    }

    console.log('\n2. Testing getClubStats(mockId)...');
    // We need a valid club ID to test effectively. Let's try to search one.
    const clubs = await db.searchClubs('a'); // Search for 'a' to get something
    if (clubs.length > 0) {
        const clubId = clubs[0].id;
        console.log(`Testing with Club: ${clubs[0].name} (${clubId})`);

        try {
            const stats = await db.getClubStats(clubId, seasonId);
            console.log('Club Stats:', stats);
            if (stats && stats.matches_played !== undefined) {
                console.log('PASS: Club stats has matches_played');
            } else {
                console.error('FAIL: Club stats missing matches_played (or stats null)');
            }
        } catch (e) {
            console.error('FAIL: getClubStats error:', e);
        }
    } else {
        console.log('SKIP: No clubs found to test stats.');
    }

    console.log('--- VERIFICATION COMPLETE ---');
    process.exit(0);
}

test();
