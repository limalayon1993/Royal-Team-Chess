
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const GameManager = require('../gameManager');
const db = require('../db');
const { createClient } = require('@supabase/supabase-js');

// LOGGER setup
const LOG_FILE = path.join(__dirname, 'report.txt');
const logs = [];

function log(msg) {
    console.log(msg); // Keep console
    try {
        if (typeof msg !== 'string') msg = JSON.stringify(msg, null, 2);
        logs.push(msg);
    } catch (e) { }
}

function flushLogs() {
    try {
        fs.writeFileSync(LOG_FILE, logs.join('\n'));
    } catch (e) {
        console.error('Failed to write report.txt', e);
    }
}

// Override console
const originalError = console.error;
console.error = (...args) => {
    originalError(...args);
    log('[ERROR] ' + args.join(' '));
};


// --- CONFIG ---
const TEST_PREFIX = 'TEST_SCORING';
const TIMESTAMP = Date.now();
// Unique names to avoid collision
const USER_A = `${TEST_PREFIX}_UserA_${TIMESTAMP}`;
const USER_B = `${TEST_PREFIX}_UserB_${TIMESTAMP}`;
const CLUB_A = `${TEST_PREFIX}_ClubA_${TIMESTAMP}`;
const CLUB_B = `${TEST_PREFIX}_ClubB_${TIMESTAMP}`;

log(`Run ID: ${TIMESTAMP}`);

// Direct Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) {
    log('CRITICAL: Missing Supabase Credentials in .env');
    flushLogs();
    process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Mock Socket.io
class MockSocket {
    constructor(id) { this.id = id; }
    join() { }
    emit(evt, data) {
        // log(`[Socket ${this.id}] Emit: ${evt}`); 
    }
}

const mockIo = {
    to: (room) => ({ emit: (evt, data) => { /* log(`[IO Room ${room}] ${evt}`); */ } }),
    emit: (evt, data) => { },
    sockets: {
        adapter: { rooms: { get: () => new Set() } },
        sockets: { get: (id) => new MockSocket(id) }
    }
};

// Instantiate GameManager
const gm = new GameManager(mockIo);

// --- HELPERS ---

async function createTestUser(username) {
    log(`Creating User: ${username}`);
    const email = `${username.toLowerCase()}@example.com`;
    // Clean up if exists (zombie from failed run)
    // Actually just create unique
    const { data, error } = await supabase.auth.admin.createUser({
        email: email,
        password: 'password123',
        user_metadata: { username: username },
        email_confirm: true
    });

    if (error) throw new Error(`Failed to create auth user ${username}: ${error.message}`);

    // Ensure profile
    let profile = null;
    for (let i = 0; i < 10; i++) {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        if (p) { profile = p; break; }
        await new Promise(r => setTimeout(r, 500));
    }

    if (!profile) {
        log(`Warning: Profile trigger slow, manual insert for ${username}`);
        await supabase.from('profiles').insert([{ id: data.user.id, username, elo: 1000 }]);
        profile = (await supabase.from('profiles').select('*').eq('id', data.user.id).single()).data;
    }

    return { id: data.user.id, username, socketId: `socket_${username}` };
}

async function createTestClub(name, ownerId) {
    log(`Creating Club: ${name}`);
    const { data, error } = await supabase.from('clubs').insert([{
        name,
        owner_id: ownerId,
        description: 'Test Club',
        division: 1
    }]).select().single();

    if (error) throw new Error(`Failed to create club ${name}: ${error.message}`);

    // Check member
    const { data: member } = await supabase.from('club_members').select('*').eq('club_id', data.id).eq('user_id', ownerId).single();
    if (!member) {
        // Manually insert if trigger didn't
        await supabase.from('club_members').insert([{ club_id: data.id, user_id: ownerId, role: 'owner' }]);
    }

    // Init stats
    const seasonId = getSeasonId();
    const { data: exist } = await supabase.from('club_seasonal_stats').select('*').eq('club_id', data.id).eq('season_id', seasonId).maybeSingle();

    if (!exist) {
        await supabase.from('club_seasonal_stats').insert([{
            club_id: data.id,
            season_id: seasonId,
            season_points: 0,
            matches_played: 0,
            matches_won: 0,
            matches_lost: 0,
            matches_drawn: 0
        }]);
    }

    return data;
}

function getSeasonId() {
    const spainTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
    return `${spainTime.getFullYear()}-${String(spainTime.getMonth() + 1).padStart(2, '0')}`;
}

async function getStats(userId) {
    const { data } = await supabase.from('user_stats').select('*').eq('user_id', userId).eq('season_id', getSeasonId()).maybeSingle();
    return data || {};
}

async function getClubMemberStats(userId, clubId) {
    const { data } = await supabase.from('club_members').select('*').eq('user_id', userId).eq('club_id', clubId).single();
    return data || {};
}

async function getClubStats(clubId) {
    const { data } = await supabase.from('club_seasonal_stats').select('*').eq('club_id', clubId).eq('season_id', getSeasonId()).maybeSingle();
    return data || {};
}

// --- TEST RUNNER ---

async function runTests() {
    log('=== STARTING TESTS ===');

    let userA, userB;
    let clubA, clubB;

    try {
        // 1. SETUP
        userA = await createTestUser(USER_A);
        userB = await createTestUser(USER_B);

        clubA = await createTestClub(CLUB_A, userA.id);
        clubB = await createTestClub(CLUB_B, userB.id);

        gm.userElos.set(userA.username, 1000);
        gm.userElos.set(userB.username, 1000);

        // 2. SCENARIO 1: INDIVIDUAL MATCH (User A wins)
        log('\n--- Scenario 1: Individual Match (User A Wins) ---');

        const roomId1 = 'match_1';
        gm.rooms.set(roomId1, {
            id: roomId1,
            active: true,
            finished: false,
            metadata: { isMatchmaking: true, name: 'Indiv Match' },
            usernames: new Map([[userA.socketId, userA.username], [userB.socketId, userB.username]]),
            players: { white: [userA.socketId], black: [userB.socketId], spectators: [] },
            boards: [],
            scores: { white: 0, black: 0 },
            boardResults: []
        });

        const board1 = {
            id: 0,
            active: true,
            whitePlayerId: userA.socketId,
            blackPlayerId: userB.socketId,
            game: {
                history: () => [],
                fen: () => 'start_fen',
                turn: () => 'w'
            }
        };
        gm.rooms.get(roomId1).boards.push(board1);

        log(`Calling handleBoardEnd for S1`);
        // handleBoardEnd is sync but triggers async stats
        gm.handleBoardEnd(roomId1, 0, 'white', 'checkmate', 3);

        // Wait for Async
        await new Promise(r => setTimeout(r, 2000));

        const statsA1 = await getStats(userA.id);
        const statsB1 = await getStats(userB.id);

        log(`User A Points: ${statsA1.season_points} (Exp: 3)`);
        log(`User B Points: ${statsB1.season_points} (Exp: 0)`);

        if (statsA1.season_points !== 3) throw new Error(`S1 Fail: A=${statsA1.season_points}`);
        if (statsA1.wins !== 1) throw new Error(`S1 Fail: A wins=${statsA1.wins}`);
        if (statsB1.losses !== 1) throw new Error(`S1 Fail: B losses=${statsB1.losses}`);

        log('✅ Scenario 1 PASS');


        // 3. SCENARIO 2: TEAM MATCH
        log('\n--- Scenario 2: Club Match (User A [Club A] vs User B [Club B]) ---');

        const roomId2 = 'match_2';
        gm.rooms.set(roomId2, {
            id: roomId2,
            active: true,
            finished: false,
            metadata: {
                isMatchmaking: true,
                name: 'Club Match',
                clubIds: { white: clubA.id, black: clubB.id }
            },
            usernames: new Map([[userA.socketId, userA.username], [userB.socketId, userB.username]]),
            players: { white: [userA.socketId], black: [userB.socketId], spectators: [] },
            boards: [],
            scores: { white: 0, black: 0 },
            boardResults: []
        });

        const board2 = {
            id: 0,
            active: true,
            whitePlayerId: userA.socketId,
            blackPlayerId: userB.socketId,
            game: { history: () => [], fen: () => 'fen', turn: () => 'w' }
        };
        gm.rooms.get(roomId2).boards.push(board2);

        log(`Calling handleBoardEnd for S2`);
        gm.handleBoardEnd(roomId2, 0, 'white', 'resignation', 3);

        await new Promise(r => setTimeout(r, 2000));

        const memberA = await getClubMemberStats(userA.id, clubA.id);
        log(`Club Member A Contrib: ${memberA.season_points_contribution} (Exp: 3)`);
        if (memberA.season_points_contribution !== 3) throw new Error(`S2 Fail: Member=${memberA.season_points_contribution}`);

        // Matches Won aggregation
        const clubStatsA = await getClubStats(clubA.id);

        log(`Club A Wins: ${clubStatsA.matches_won} (Exp: 1)`);
        log(`Club A Points: ${clubStatsA.season_points} (Exp: 3)`);

        if (clubStatsA.matches_won !== 1) throw new Error(`S2 Fail: ClubA wins=${clubStatsA.matches_won}`);
        if (clubStatsA.season_points !== 3) throw new Error(`S2 Fail: ClubA points=${clubStatsA.season_points}`);

        log('✅ Scenario 2 PASS');


        // 4. SCENARIO 3: DRAW
        log('\n--- Scenario 3: Draw ---');

        const roomId3 = 'match_3';
        gm.rooms.set(roomId3, {
            id: roomId3,
            active: true,
            finished: false,
            metadata: { isMatchmaking: true },
            usernames: new Map([[userA.socketId, userA.username], [userB.socketId, userB.username]]),
            players: { white: [userA.socketId], black: [userB.socketId], spectators: [] },
            boards: [],
            scores: { white: 0, black: 0 },
            boardResults: []
        });

        const board3 = {
            id: 0,
            active: true,
            whitePlayerId: userA.socketId,
            blackPlayerId: userB.socketId,
            game: { history: () => [], fen: () => 'fen', turn: () => 'w' }
        };
        gm.rooms.get(roomId3).boards.push(board3);

        log(`Calling handleBoardEnd for S3`);
        gm.handleBoardEnd(roomId3, 0, null, 'draw', 1);

        await new Promise(r => setTimeout(r, 2000));

        const statsA3 = await getStats(userA.id);
        const statsB3 = await getStats(userB.id);

        log(`User A Final: ${statsA3.season_points} (Exp: 7)`);
        log(`User B Final: ${statsB3.season_points} (Exp: 1)`);

        if (statsA3.season_points !== 7) throw new Error(`S3 Fail: A=${statsA3.season_points}`);
        if (statsB3.season_points !== 1) throw new Error(`S3 Fail: B=${statsB3.season_points}`);

        log('✅ Scenario 3 PASS');

    } catch (err) {
        log(`❌ FAILED: ${err.message}`);
        log(err.stack);
        // Force write before exit
        flushLogs();
        process.exit(1);
    } finally {
        log('\n--- CLEANUP ---');
        try {
            if (userA) await db.deleteUser(userA.username);
            if (userB) await db.deleteUser(userB.username);

            if (clubA) await db.deleteClub(clubA.id);
            if (clubB) await db.deleteClub(clubB.id);
            log('Cleanup done');
        } catch (e) {
            log(`Cleanup Error: ${e.message}`);
        }
        flushLogs();
    }
}

runTests();
