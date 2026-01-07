const db = require('../db');

async function repair() {
    console.log('[Repair] Starting Repair for 2026-01...');

    const seasonId = '2026-01'; // Current Season to fix
    const prevSeasonId = '2025-12'; // Previous Season for Trophies

    // 1. Award Missing Trophy to "The First Chess Club"
    console.log('[Repair] Checking Trophy Assignment...');
    const clubName = 'The First Chess Club';
    const trophyName = 'Campeón de Primera División';

    // Need raw access or helpers?
    // We can use db helpers if available.

    // A. Find Club
    // We can use `searchClubs` or direct query if possible, but let's assume we can query via valid DB connection
    // We'll wait a second for connection
    await new Promise(r => setTimeout(r, 1000));

    if (!db.isConnected()) {
        console.error('[Repair] DB Not Connected!');
        return;
    }

    // A. Find Trophy
    const trophy = await db.getTrophyByName(trophyName);
    if (!trophy) {
        console.error(`[Repair] Trophy '${trophyName}' not found!`);
    } else {
        // B. Find Club ID (Search hack)
        const clubs = await db.searchClubs(clubName);
        const club = clubs.find(c => c.name === clubName);

        if (club) {
            console.log(`[Repair] Found club '${clubName}' (${club.id}). Awarding trophy...`);
            await db.awardClubTrophy(club.id, trophy.id, prevSeasonId);
        } else {
            console.error(`[Repair] Club '${clubName}' not found.`);
        }
    }

    // 2. Initialize Stats for 2026-01 for ALL Clubs
    console.log('[Repair] Initializing Missing Stats for 2026-01...');

    // We need to fetch ALL clubs. db.js doesn't expose "getAllClubs", but "searchClubs" with empty string might?
    // Let's rely on a large search or iterate.
    // Or better, since this is a script, we can require supabase directly?
    // No, db.js encapsulates it.
    // Let's use searchClubs with a common letter or loop?
    // "searchClubs" uses ilike '%query%'. Passing ' ' or 'a' might work.
    // Actually, let's just use `db.searchClubs('')` if the query allows logic.
    // In db.js: .ilike('name', `%${query}%`). If query is '', `%` matches all.

    // Warning: LIMIT 20 in searchClubs.
    // We need a way to get ALL clubs.
    // I can't easily add `getAllClubs` to db.js right now without another edit.
    // I already did edits.
    // I can modify `searchClubs` limit via argument? No.

    // Quick Fix: I'll use the Supabase client directly since it's available in `db.js` scope... wait, `db.js` exports `createClient`? No.
    // I can import `createClient` here and use same credentials.

    require('dotenv').config({ path: '../../.env' }); // Adjust path to root?
    // root is c:\Users\Antonio Lima\Desktop\RTC\royal-team-chess
    // script is in /server/scripts
    // path should be ../../.env

    // WAIT! db.js already requires dotenv.
    // Accessing process.env should work if started from root?
    // I will run with `node server/scripts/fix_2026_01.js`, so CWD is root.

    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('[Repair] Missing Env Vars (VITE_SUPABASE_URL / VITE_SUPABASE_SERVICE_KEY)');
        console.log('Current Env:', process.env);
        // Fallback to reading them from db.js logic? No.
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: allClubs, error } = await supabase.from('clubs').select('id, name, division');
    if (error) {
        console.error('[Repair] Failed to fetch clubs:', error);
        return;
    }

    console.log(`[Repair] Found ${allClubs.length} clubs.`);

    for (const club of allClubs) {
        // Initialize if missing
        // Verify division validity
        const div = club.division || 1;

        // Use DB helper
        await db.initializeClubStats(club.club_id || club.id, seasonId, div);
    }

    console.log('[Repair] Done.');
    process.exit(0);
}

repair();
