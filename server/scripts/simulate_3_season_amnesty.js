/**
 * TEST SCRIPT: 3-Season Visual Amnesty Simulation
 * 
 * Objectives:
 * - Season 1 (Start): Div1(20), Div2(20), Div3(10). Expected: Normal 3 Up/3 Down.
 * - Season 2 (Disruption): Delete 1 from D1, 1 from D2. Expected: Amnesty handling.
 * - Season 3 (Recovery): Normal.
 * 
 * Visual Output focus.
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const LeagueManager = require('../leagueManager');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const S1 = '8000-01'; // Season 1 End -> S2
const S2 = '8000-02'; // Season 2 End -> S3
const S3 = '8000-03'; // Season 3 End

async function runVisualSim() {
    console.log('\n=============================================');
    console.log('       3-SEASON VISUAL AMNESTY CHECK       ');
    console.log('=============================================\n');

    await cleanup();

    try {
        // --- PHASE 1: SETUP ---
        console.log('Building World (D1:20, D2:20, D3:10)...');
        await createClubs(20, 1, S1);
        await createClubs(20, 2, S1);
        await createClubs(10, 3, S1);
        console.log('World Built.\n');

        // --- SEASON 1: NORMAL ---
        console.log('--- [ SEASON 1 ENDING ] ---');
        console.log('Status: Normal Season. No missing teams.');

        await LeagueManager.processSeasonEnd(S1);

        await printSeasonReport(S2, "SEASON 2 START (After S1 Transition)");

        // --- SEASON 2: DISRUPTION ---
        console.log('\n--- [ SEASON 2 DISRUPTION ] ---');
        console.log('Action: Deleting 1 Team from Div 1.');
        console.log('Action: Deleting 1 Team from Div 2.');

        // Delete 1 from D1
        const { data: d1clubs } = await supabase.from('club_seasonal_stats').select('club_id').eq('season_id', S2).eq('division', 1).limit(1);
        await supabase.from('clubs').delete().eq('id', d1clubs[0].club_id);

        // Delete 1 from D2
        const { data: d2clubs } = await supabase.from('club_seasonal_stats').select('club_id').eq('season_id', S2).eq('division', 2).limit(1);
        await supabase.from('clubs').delete().eq('id', d2clubs[0].club_id);

        console.log('Teams Deleted. Processing Season End...\n');

        await LeagueManager.processSeasonEnd(S2);

        await printSeasonReport(S3, "SEASON 3 START (After S2 Amnesty)");

        // --- SEASON 3: NORMAL ---
        console.log('\n--- [ SEASON 3 ENDING ] ---');
        console.log('Status: Normal Season.');
        await LeagueManager.processSeasonEnd(S3);

        await printSeasonReport('8000-04', "SEASON 4 START (Final State)");

        console.log('\n✅ SIMULATION COMPLETE');

    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await cleanup();
    }
}

async function printSeasonReport(seasonId, title) {
    console.log(`\n> ${title} [${seasonId}]`);

    const d1 = await getDivCount(1, seasonId);
    const d2 = await getDivCount(2, seasonId);
    const d3 = await getDivCount(3, seasonId);

    console.log(`  DIV 1: ${d1} Teams`);
    console.log(`  DIV 2: ${d2} Teams`);
    console.log(`  DIV 3: ${d3} Teams`); // Should be whatever is left

    // Check Amnesty Logic match
    if (d1 === 20 && d2 === 20) {
        console.log('  STATUS: ✅ FULL STRENGTH (20/20)');
    } else {
        console.log('  STATUS: ⚠️ GAP DETECTED');
    }
}

// Reuse helpers
async function createClubs(count, div, season) {
    const ownerId = await getTestUser();
    for (let i = 0; i < count; i++) {
        const name = `VISUAL_${season}_D${div}_${i}_${Math.random().toString(36).substring(7)}`;
        const { data: c } = await supabase.from('clubs').insert([{ name, owner_id: ownerId, description: 'Visual Test' }]).select().single();
        if (c) {
            await supabase.from('club_seasonal_stats').insert([{
                club_id: c.id,
                season_id: season,
                division: div,
                season_points: i * 10, // Deterministic scoring roughly
                matches_played: 10, matches_won: 5
            }]);
        }
    }
}

async function getDivCount(div, season) {
    const { count } = await supabase.from('club_seasonal_stats').select('*', { count: 'exact', head: true }).eq('season_id', season).eq('division', div);
    return count;
}

let _testUser = null;
async function getTestUser() {
    if (_testUser) return _testUser;
    const { data } = await supabase.from('profiles').select('id').eq('username', 'VisualTester').single();
    if (data) { _testUser = data.id; return data.id; }
    const { data: u } = await supabase.auth.admin.createUser({ email: 'visual@test.com', password: 'password123', user_metadata: { username: 'VisualTester' }, email_confirm: true });
    if (u.user) {
        await supabase.from('profiles').insert([{ id: u.user.id, username: 'VisualTester', elo: 1000 }]);
        _testUser = u.user.id;
        return u.user.id;
    }
}

async function cleanup() {
    await supabase.from('club_seasonal_stats').delete().like('season_id', '8000%');
    await supabase.from('clubs').delete().like('name', 'VISUAL_%');
}

runVisualSim();
