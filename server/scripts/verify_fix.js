const db = require('../db');

async function verify() {
    console.log('[Verify] Checking Stats for 2026-01...');

    // 1. Get Club "The First Chess Club"
    // We can't use search with raw query easily via db.js standard methods without connection wait
    await new Promise(r => setTimeout(r, 1000));

    // We know the ID from previous output: 060fe6c9-f099-47f2-896d-942e54d97d3d
    const clubId = '060fe6c9-f099-47f2-896d-942e54d97d3d';

    const stats = await db.getLeagueStandings('2026-01', 1);
    console.log(`[Verify] Division 1 Standings Count: ${stats.length}`);

    const myClub = stats.find(s => s.club_id === clubId);
    if (myClub) {
        console.log('[Verify] Found Club in Standings!');
        console.log(JSON.stringify(myClub, null, 2));
    } else {
        console.error('[Verify] Club NOT found in standings.');
    }

    // Check Trophy
    const trophies = await db.getClubTrophies(clubId);
    const trophy = trophies.find(t => t.season_id === '2025-12' && t.trophy.name.includes('Campeón'));
    if (trophy) {
        console.log('[Verify] Trophy Found:', trophy.trophy.name);
    } else {
        console.error('[Verify] Trophy NOT found.');
    }

    process.exit(0);
}

verify();
