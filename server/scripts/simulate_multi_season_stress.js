/**
 * TEST SCRIPT: Multi-Season Stress Test
 * 
 * Objectives:
 * 1. Verify that full divisions (20 teams) maintain 20 teams under normal conditions.
 * 2. Verify that partial divisions (e.g. Div 3) act as feeders.
 * 3. Verify SYSTEM RECOVERY: If teams are deleted (eliminated) in Div 1, the system should
 *    automatically refill Div 1 to 20 in the next season by adjusting relegations/promotions.
 * 
 * Scenario:
 * - Start: Div 1 (20), Div 2 (20), Div 3 (10).
 * - End Season 1: Expect Div 1 (20), Div 2 (20).
 * - Action: DELETE 2 Clubs from Div 1.
 * - End Season 2: Expect Div 1 to refill to 20 (pulling from Div 2).
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const LeagueManager = require('../leagueManager');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const S1 = '9000-01';
const S2 = '9000-02';
const S3 = '9000-03';

async function runStressTest() {
    console.log('=== STARTING MULTI-SEASON STRESS TEST ===');
    await cleanup();

    try {
        // --- PHASE 1: SETUP ---
        console.log('\n--- PHASE 1: INITIAL SETUP ---');
        // Create 50 Clubs
        // Div 1: 20
        // Div 2: 20
        // Div 3: 10
        const div1Ids = await createClubs(20, 1, S1);
        const div2Ids = await createClubs(20, 2, S1);
        const div3Ids = await createClubs(10, 3, S1);
        console.log(`Created: D1(${div1Ids.length}), D2(${div2Ids.length}), D3(${div3Ids.length})`);

        // --- PHASE 2: SEASON 1 TRANSITION (Stability) ---
        console.log('\n--- PHASE 2: SEASON 1 END (Stability Check) ---');
        await LeagueManager.processSeasonEnd(S1);

        const d1_s2 = await getDivCount(1, S2);
        const d2_s2 = await getDivCount(2, S2);

        console.log(`Results S2: Div1=${d1_s2}, Div2=${d2_s2}`);
        if (d1_s2 !== 20 || d2_s2 !== 20) throw new Error(`Stability Failed! Expected 20/20, got ${d1_s2}/${d2_s2}`);
        console.log('✅ Stability Verified: Full divisions remained full.');

        // --- PHASE 3: ELIMINATION & RECOVERY ---
        console.log('\n--- PHASE 3: ELIMINATION & RECOVERY ---');

        // Fetch actual club IDs from S2 to delete
        const { data: currentD1 } = await supabase.from('club_seasonal_stats').select('club_id').eq('season_id', S2).eq('division', 1);
        const clubsToDelete = currentD1.slice(0, 2).map(c => c.club_id);

        console.log(`Deleting 2 clubs from Div 1: ${clubsToDelete.join(', ')}`);
        // Actual Delete from DB to simulate "Disbanding"
        for (const cid of clubsToDelete) {
            await supabase.from('clubs').delete().eq('id', cid);
        }

        // Run Season 2 End
        await LeagueManager.processSeasonEnd(S2);

        // --- PHASE 4: FINAL VERIFICATION ---
        console.log('\n--- PHASE 4: FINAL VERIFICATION (S3) ---');
        const d1_s3 = await getDivCount(1, S3);
        const d2_s3 = await getDivCount(2, S3);

        console.log(`Results S3: Div1=${d1_s3}, Div2=${d2_s3}`);

        // EXPECTATION:
        // Div 1 lost 2. Had 18.
        // Incoming from Div 2: Top 3.
        // Total Candidates: 18 + 3 = 21.
        // Excess: 1.
        // Relegation: 1.
        // Final Div 1: 20.
        // Final Div 2: 
        //   Start: 20. 
        //   Promoted to D1: 3.
        //   Relegated from D1: 1.
        //   Incoming from D3: 3 (since D3 has 10).
        //   Net: 20 - 3 + 1 + 3 = 21.
        //   Target 20 -> Excess 1 -> Relegate 1 to D3.
        //   Final D2: 20.

        if (d1_s3 === 20) {
            console.log('✅ RECOVERY SUCCESS: Div 1 automatically refilled to 20 teams.');
        } else {
            console.error(`❌ RECOVERY FAILED: Div 1 has ${d1_s3} teams (Expected 20).`);
        }

        if (d2_s3 === 20) {
            console.log('✅ CASCADE SUCCESS: Div 2 also maintained 20 teams.');
        } else {
            console.warn(`⚠️ CASCADE REVIEW: Div 2 has ${d2_s3} teams.`);
        }

    } catch (e) {
        console.error('TEST FAILED:', e);
    } finally {
        await cleanup();
    }
}

// --- HELPERS ---

async function createClubs(count, div, season) {
    const ids = [];
    // We reuse a dummy owner or create one
    const ownerId = await getTestUser();

    for (let i = 0; i < count; i++) {
        const name = `STRESS_${season}_D${div}_${i}_${Math.random().toString(36).substring(7)}`;
        // Create Club
        const { data: c } = await supabase.from('clubs').insert([{
            name,
            owner_id: ownerId,
            description: 'Stress Test'
        }]).select().single();

        if (c) {
            ids.push(c.id);
            // Create Stats
            // Random points to ensure sorting isn't identical
            const points = Math.floor(Math.random() * 100);
            await supabase.from('club_seasonal_stats').insert([{
                club_id: c.id,
                season_id: season,
                division: div,
                season_points: points,
                matches_played: 10,
                matches_won: 5,
                club_id: c.id // ensure consistency
            }]);
        }
    }
    return ids;
}

async function getDivCount(div, season) {
    const { count } = await supabase.from('club_seasonal_stats')
        .select('*', { count: 'exact', head: true })
        .eq('season_id', season)
        .eq('division', div);
    return count;
}

let _testUser = null;
async function getTestUser() {
    if (_testUser) return _testUser;
    const { data } = await supabase.from('profiles').select('id').eq('username', 'StressTester').single();
    if (data) { _testUser = data.id; return data.id; }

    // Create
    const { data: u } = await supabase.auth.admin.createUser({
        email: 'stress@test.com',
        password: 'password123',
        user_metadata: { username: 'StressTester' },
        email_confirm: true
    });

    // Profile
    if (u.user && u.user.id) {
        await supabase.from('profiles').insert([{ id: u.user.id, username: 'StressTester', elo: 1000 }]);
        _testUser = u.user.id;
        return u.user.id;
    }
}

async function cleanup() {
    console.log('Cleaning up stress test data...');
    // Delete stats
    await supabase.from('club_seasonal_stats').delete().like('season_id', '9000%');
    // Delete clubs
    await supabase.from('clubs').delete().like('name', 'STRESS_%');
    console.log('Cleanup Done.');
}

runStressTest();
