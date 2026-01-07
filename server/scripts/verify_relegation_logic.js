/**
 * TEST SCRIPT: Verify Adaptive Relegation Logic
 * 
 * Scenario:
 * - Season: 9999-01
 * - Division 1: 18 Clubs (Target 20) -> Should accept promotions but limit relegation.
 * - Division 2: 5 Clubs (Feeder) -> Top 3 should promote.
 * 
 * Expected Outcome:
 * -Promotions: 3 clubs from Div 2 move to Div 1.
 * - Virtual Div 1 Size: 18 + 3 = 21.
 * - Excess: 1.
 * - Relegations: 1 club from Div 1 moves to Div 2.
 * - Final Div 1: 20 Clubs.
 * - Final Div 2: 2 Clubs (remaining) + 1 (relegated) = 3 Clubs.
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const LeagueManager = require('../leagueManager'); // Uses db internally

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SEASON_ID = '9999-01';
const NEXT_SEASON_ID = '9999-02';

async function runTest() {
    console.log('=== STARTING RELEGATION LOGIC TEST ===');

    // 1. CLEANUP (Just in case)
    await cleanup();

    const createdClubs = [];

    try {
        // 2. SETUP DATA
        console.log('Creating Test Data...');

        // Create 18 Clubs in Div 1
        for (let i = 0; i < 18; i++) {
            const club = await createMockClub(`Div1_C${i}`, 1, 100 + i); // Points 100+i (Higher i = Better)
            createdClubs.push(club);
        }

        // Create 5 Clubs in Div 2
        for (let i = 0; i < 5; i++) {
            const club = await createMockClub(`Div2_C${i}`, 2, 50 + i);
            createdClubs.push(club);
        }

        console.log('Data Setup Complete. Running Season End...');

        // 3. EXECUTE LOGIC
        await LeagueManager.processSeasonEnd(SEASON_ID);

        // 4. VERIFY
        console.log('Verifying Results...');

        // Check Div 1 in Next Season
        const { data: div1Clubs } = await supabase
            .from('club_seasonal_stats')
            .select('club_id, division')
            .eq('season_id', NEXT_SEASON_ID)
            .eq('division', 1);

        // Check Div 2 in Next Season
        const { data: div2Clubs } = await supabase
            .from('club_seasonal_stats')
            .select('club_id, division')
            .eq('season_id', NEXT_SEASON_ID)
            .eq('division', 2); // Includes relegated from D1 + remaining D2

        console.log(`Div 1 Size (Next): ${div1Clubs.length} (Expected 20)`);
        console.log(`Div 2 Size (Next): ${div2Clubs.length} (Expected 3)`);

        if (div1Clubs.length === 20 && div2Clubs.length === 3) {
            console.log('✅ TEST PASSED: Adaptive Logic correctly normalized Div 1 to 20 teams.');
        } else {
            console.error('❌ TEST FAILED: Counts do not match expectations.');
        }

    } catch (e) {
        console.error('CRITICAL ERROR:', e);
    } finally {
        await cleanup();
    }
}

async function createMockClub(name, division, points) {
    // 1. Create Club
    const { data: club, error } = await supabase.from('clubs')
        .insert([{ name: `${SEASON_ID}_${name}`, owner_id: '00000000-0000-0000-0000-000000000000', description: 'TEST' }]) // Owner ID irrelevant for this logic, need valid UUID format though?
    // Actually, FK constraint on owner_id might fail if user doesn't exist.
    // Let's create a dummy owner if needed, or assume we can Insert with null owner?
    // Schema likely requires owner.
    // Quick fix: Fetch an existing user or create one dummy.
    // Better: Use a known valid UUID if no FK check, or create one.
    // Let's try to create a dummy user first.

    // We need a user.
    // Let's just use 'createSimUser' logic logic or similar.
    // Or just fetch ANY user.

    return club;
}

// Redefining helper simplified
async function quickUser() {
    // Try to get a user
    const { data } = await supabase.from('profiles').select('id').limit(1).single();
    if (data) return data.id;
    // Create one
    const { data: u } = await supabase.auth.admin.createUser({ email: 'test_rel@test.com', password: 'password' });
    return u.user.id;
}

async function createMockClub(name, division, points) {
    const ownerId = await getTestUser();

    // Create Club
    const { data: club } = await supabase.from('clubs')
        .insert([{ name: `${SEASON_ID}_${name}`, owner_id: ownerId, description: 'TEST' }])
        .select()
        .single();

    // Create Stats
    await supabase.from('club_seasonal_stats').insert([{
        club_id: club.id,
        season_id: SEASON_ID,
        division: division,
        season_points: points,
        matches_played: 10,
        matches_won: 5
    }]);

    return club;
}

let _testUser = null;
async function getTestUser() {
    if (_testUser) return _testUser;
    const { data } = await supabase.from('profiles').select('id').eq('username', 'TEST_RUNNER').single();
    if (data) { _testUser = data.id; return data.id; }

    const { data: u, error } = await supabase.auth.admin.createUser({ email: 'test_runner@test.com', user_metadata: { username: 'TEST_RUNNER' }, password: 'password123', email_confirm: true });

    // Ensure profile
    if (u && u.user) {
        await supabase.from('profiles').insert([{ id: u.user.id, username: 'TEST_RUNNER', elo: 1000 }]);
        _testUser = u.user.id;
        return u.user.id;
    }
    throw new Error("Could not create test user");
}

async function cleanup() {
    console.log('Cleaning up...');
    // Delete stats for test seasons
    await supabase.from('club_seasonal_stats').delete().like('season_id', '9999%');
    // Delete test clubs
    await supabase.from('clubs').delete().like('name', '9999-01%');
    console.log('Cleanup Done.');
}

runTest();
