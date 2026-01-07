
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const GameManager = require('../gameManager');
const LeagueManager = require('../leagueManager');
const db = require('../db');
const { createClient } = require('@supabase/supabase-js');

// LOGGER setup
const LOG_FILE = path.join(__dirname, 'simulation_report.txt');
const logs = [];

function log(msg) {
    console.log(msg);
    try {
        if (typeof msg !== 'string') msg = JSON.stringify(msg, null, 2);
        logs.push(`[${new Date().toISOString()}] ${msg}`);
    } catch (e) { }
    flushLogs(); // Flush on every log to keep track if crash
}

function flushLogs() {
    try {
        fs.writeFileSync(LOG_FILE, logs.join('\n'));
    } catch (e) {
        console.error('Failed to write report.txt', e);
    }
}

// Override console error to capture it
const originalError = console.error;
console.error = (...args) => {
    originalError(...args);
    log('[ERROR] ' + args.join(' '));
};

// --- CONFIG ---
const SIM_PREFIX = 'SIM_S1';
const TIMESTAMP = Date.now();

// 6 Clubs, 5 members each = 30 Users
const CLUB_COUNT = 6;
const MEMBERS_PER_CLUB = 5;
const MATCHES_TO_SIMULATE = 50; // Random matches

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    log('CRITICAL: Missing Supabase Credentials in .env');
    process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Mock Socket.io
class MockSocket {
    constructor(id) { this.id = id; }
    join() { }
    emit(evt, data) { }
}

const mockIo = {
    to: (room) => ({ emit: (evt, data) => { } }),
    emit: (evt, data) => { },
    sockets: {
        adapter: { rooms: { get: () => new Set() } },
        sockets: { get: (id) => new MockSocket(id) }
    }
};

const gm = new GameManager(mockIo);

// --- STATE ---
let users = []; // { id, username, socketId, clubId }
let clubs = []; // { id, name, ownerId }

// --- HELPERS ---

async function createSimUser(i) {
    const username = `${SIM_PREFIX}_U${i}_${TIMESTAMP}`;
    const email = `${username.toLowerCase()}@test.com`;

    // 1. Auth
    const { data, error } = await supabase.auth.admin.createUser({
        email: email,
        password: 'password123',
        user_metadata: { username: username },
        email_confirm: true
    });
    if (error) throw error;

    const userId = data.user.id;

    // 2. Profile (Wait for trigger or insert)
    let { data: profile } = await supabase.from('profiles').select('*').eq('username', username).single();
    if (!profile) {
        // Fallback manual insert if trigger lag
        await supabase.from('profiles').insert([{ id: userId, username, elo: 1000 }]);
        profile = { id: userId, username, elo: 1000 };
    }

    return { id: userId, username, socketId: `socket_${username}` };
}

async function runSimulation() {
    log('=== STARTING FULL SEASON SIMULATION ===');

    try {
        // 1. SETUP CLUBS & USERS
        log(`Creating ${CLUB_COUNT} Clubs with ${MEMBERS_PER_CLUB} members each...`);

        for (let c = 0; c < CLUB_COUNT; c++) {
            const clubName = `${SIM_PREFIX}_Club${c}_${TIMESTAMP}`;
            let owner = null;

            for (let m = 0; m < MEMBERS_PER_CLUB; m++) {
                const userIndex = c * MEMBERS_PER_CLUB + m;
                const user = await createSimUser(userIndex);
                users.push(user);
                gm.userElos.set(user.username, 1000); // Sync GM Elo

                if (m === 0) {
                    // Create Club
                    owner = user;
                    const { data: newClub, error } = await supabase.from('clubs').insert([{
                        name: clubName,
                        owner_id: owner.id,
                        description: 'Sim Club',
                        division: 1 // Start all in Div 1 to test relegation/fight
                    }]).select().single();
                    if (error) throw error;

                    clubs.push(newClub);
                    // Ensure owner is added (trigger usually does this)
                    await new Promise(r => setTimeout(r, 100)); // wait for trigger
                } else {
                    // Join Club
                    await db.addClubMember(clubs[c].id, user.id);
                }
                user.clubId = clubs[c].id;
            }
        }
        log(`Setup Complete. ${users.length} Users, ${clubs.length} Clubs.`);

        // 2. SIMULATE MATCHES
        log(`Simulating ${MATCHES_TO_SIMULATE} Matches...`);

        for (let i = 0; i < MATCHES_TO_SIMULATE; i++) {
            // Pick 2 random clubs
            const clubA = clubs[Math.floor(Math.random() * clubs.length)];
            let clubB = clubs[Math.floor(Math.random() * clubs.length)];
            while (clubB.id === clubA.id) clubB = clubs[Math.floor(Math.random() * clubs.length)];

            // Pick random user from each club
            const userA = users.find(u => u.clubId === clubA.id && u.id !== clubA.owner_id); // Pick non-owner for variety? Or random
            const userB = users.find(u => u.clubId === clubB.id);

            // If finding specific fails (e.g. array filter issue), fallback
            const playerA = userA || users.find(u => u.clubId === clubA.id);
            const playerB = userB || users.find(u => u.clubId === clubB.id);

            const roomId = `sim_match_${i}`;

            // Create Room
            gm.rooms.set(roomId, {
                id: roomId,
                active: true,
                metadata: {
                    isMatchmaking: true,
                    clubIds: { white: clubA.id, black: clubB.id }
                },
                usernames: new Map([[playerA.socketId, playerA.username], [playerB.socketId, playerB.username]]),
                players: { white: [playerA.socketId], black: [playerB.socketId], spectators: [] },
                boards: [{
                    id: 0,
                    active: true,
                    whitePlayerId: playerA.socketId,
                    blackPlayerId: playerB.socketId,
                    game: { history: () => [], fen: () => 'fen', turn: () => 'w' }
                }],
                scores: { white: 0, black: 0 },
                boardResults: []
            });

            // Random Result
            // 0: White Win, 1: Black Win, 2: Draw
            const outcome = Math.floor(Math.random() * 3);
            let winnerColor = null;
            let reason = '';
            let points = 0;

            if (outcome === 0) {
                winnerColor = 'white'; reason = 'checkmate'; points = 3;
            } else if (outcome === 1) {
                winnerColor = 'black'; reason = 'checkmate'; points = 3;
            } else {
                winnerColor = null; reason = 'draw'; points = 1;
            }

            // Execute End
            await gm.handleBoardEnd(roomId, 0, winnerColor, reason, points);

            if (i % 10 === 0) log(`Played ${i} matches...`);
        }

        log('All matches played.');

        // 3. CHECK STANDINGS BEFORE SEASON END
        const seasonId = LeagueManager.getSeasonId ? LeagueManager.getSeasonId() : getSeasonId();
        const standings = await db.getLeagueStandings(seasonId, 1);
        log('--- STANDINGS (Pre-Transition) ---');
        standings.forEach((s, idx) => {
            log(`${idx + 1}. ${s.club.name} - ${s.season_points} pts`);
        });

        // 4. TRIGGER SEASON END
        log('--- TRANSITIONING SEASON ---');
        await LeagueManager.processSeasonEnd(seasonId);

        // 5. VERIFY NEXT SEASON
        const nextSeasonId = getNextSeasonId(seasonId);
        log(`Checking stats for Next Season: ${nextSeasonId}`);

        // We expect Top 3 to stay (since there is no Div 0 above 1, normally... Wait, Div 1 is Top).
        // Logic: 
        // Div 1 Top 3 -> Champion (Stay Div 1)
        // Div 1 Bottom 3 -> Relegate to Div 2
        // Rest -> Stay Div 1

        const div1Next = await db.getLeagueStandings(nextSeasonId, 1);
        const div2Next = await db.getLeagueStandings(nextSeasonId, 2);

        log(`Div 1 Club Count: ${div1Next.length}`);
        log(`Div 2 Club Count: ${div2Next.length}`);

        // EXPECTATION:
        // If we had 6 clubs.
        // Top 3 stay in Div 1.
        // Bottom 3 go to Div 2.

        let errors = [];

        if (div1Next.length !== 3) errors.push(`Expected 3 clubs in Div 1, found ${div1Next.length}`);
        if (div2Next.length !== 3) errors.push(`Expected 3 clubs in Div 2, found ${div2Next.length}`);

        // Verify specific clubs
        // The ones with highest points from 'standings' should be in div1Next
        const top3Ids = standings.slice(0, 3).map(s => s.club_id);
        const nextDiv1Ids = div1Next.map(s => s.club_id);

        const correctProm = top3Ids.every(id => nextDiv1Ids.includes(id));
        if (!correctProm) errors.push('Top 3 clubs did not remain in Div 1 correctly.');

        if (errors.length > 0) {
            log('❌ VERIFICATION FAILED:');
            errors.forEach(e => log(e));
        } else {
            log('✅ VERIFICATION SUCCESSFUL: League Promotion/Relegation worked as expected.');
        }

    } catch (err) {
        log('❌ CRITICAL ERROR: ' + err.message);
        log(err.stack);
    } finally {
        log('--- CLEANUP ---');
        // Delete Users & Clubs
        // We can just delete users, cascade should handle some? Or manual delete.
        // Using existing db clean methods if available or direct supabase.
        for (const u of users) {
            await supabase.auth.admin.deleteUser(u.id);
        }
        for (const c of clubs) {
            await db.deleteClub(c.id);
        }
        log('Cleanup finished.');
        flushLogs();
        process.exit(0);
    }
}

// Helpers duplicated from code because commonJS/module issues potentially
function getSeasonId() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function getNextSeasonId(s) {
    let [y, m] = s.split('-').map(Number);
    m++;
    if (m > 12) { m = 1; y++; }
    return `${y}-${String(m).padStart(2, '0')}`;
}

runSimulation();
