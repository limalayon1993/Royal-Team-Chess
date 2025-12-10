
const { Server } = require('socket.io');
const GameManager = require('./gameManager');
const PartyManager = require('./partyManager');

// MOCK SOCKET
class MockSocket {
    constructor(id, username) {
        this.id = id;
        this.username = username;
        this.rooms = new Set();
        this.emitted = [];
    }
    join(room) { this.rooms.add(room); console.log(`[${this.username}] joined ${room}`); }
    leave(room) { this.rooms.delete(room); }
    emit(event, data) {
        this.emitted.push({ event, data });
        console.log(`[${this.username}] received '${event}':`, JSON.stringify(data).substring(0, 100) + '...');
    }
}

// MOCK IO
const io = {
    sockets: {
        sockets: new Map()
    },
    to: (room) => ({
        emit: (event, data) => console.log(`[Broadcast to ${room}] ${event}:`, JSON.stringify(data).substring(0, 100))
    }),
    emit: (event, data) => console.log(`[Broadcast All] ${event}:`, JSON.stringify(data).substring(0, 100))
};

// SETUP
const gameManager = new GameManager(io);
const partyManager = new PartyManager(io, gameManager);
gameManager.setPartyManager(partyManager);

// HELPER: Registered User
function createUser(id, username, elo = 1200) {
    const socket = new MockSocket(id, username);
    io.sockets.sockets.set(id, socket);
    gameManager.userElos.set(username, elo); // Pre-seed ELO
    partyManager.registerUser(socket, username);
    return socket;
}

async function runTests() {
    console.log("=== STARTING PARTY MATCHMAKING TESTS (SIMULATION) ===");

    // Test 1: Party of 2 joins existing room (Filling 2v2)
    console.log("\n--- Test 1: Party Fills Empty Team in Existing Room ---");
    // Create Room with 2 White Players (Waiting)
    const p1 = createUser('s1', 'Player1', 1200);
    const p2 = createUser('s2', 'Player2', 1200);

    // P1 creates room
    gameManager.createRoom(p1, {
        roomId: 'room1',
        username: 'Player1',
        settings: { teamSize: 2, time: 10, language: 'en' },
        isMatchmaking: true,
        language: 'en'
    });
    // P2 joins room
    gameManager.joinRoom(p2, { roomId: 'room1', username: 'Player2' });
    gameManager.joinTeam(p1, { roomId: 'room1', team: 'white' });
    gameManager.joinTeam(p2, { roomId: 'room1', team: 'white' });

    console.log("Room 1 created. White Team Full (2/2). Black Team Empty.");

    // Create Party of 2
    const p3 = createUser('s3', 'PartyLeader', 1200);
    const p4 = createUser('s4', 'PartyMember', 1200);

    // Create Party
    partyManager.createParty(p3, 'PartyLeader');
    partyManager.handleJoinParty(p4, { partyId: partyManager.socketToParty.get(p3.id), username: 'PartyMember' });

    console.log("Party created with Leader 'PartyLeader' and 'PartyMember'.");

    // Leader searches for match
    // Note: Implicitly testing Language Override. P3 uses 'es', but Party should force 'any'.
    console.log("Party Leader searching (Settings: size=2, lang=es)...");
    gameManager.handleFindMatch(p3, {
        username: 'PartyLeader',
        settings: { teamSize: 2, time: 10, language: 'es' } // Intentional mismatch to test override
    });

    const room = gameManager.rooms.get('room1');
    console.log(`Room State: White=${room.players.white.length}, Black=${room.players.black.length}`);

    if (room.players.black.length === 2) {
        console.log("✅ SUCCESS: Party joined Black team!");
    } else {
        console.log("❌ FAILURE: Party did not join.");
    }

    // Test 2: Party vs Party Queue
    console.log("\n--- Test 2: Party vs Party Queue Matching ---");

    const p5 = createUser('s5', 'LeaderAlpha', 1500);
    const p6 = createUser('s6', 'MemberAlpha', 1500);
    partyManager.createParty(p5, 'LeaderAlpha');
    partyManager.handleJoinParty(p6, { partyId: partyManager.socketToParty.get(p5.id), username: 'MemberAlpha' });

    const p7 = createUser('s7', 'LeaderBeta', 1500);
    const p8 = createUser('s8', 'MemberBeta', 1500);
    partyManager.createParty(p7, 'LeaderBeta');
    partyManager.handleJoinParty(p8, { partyId: partyManager.socketToParty.get(p7.id), username: 'MemberBeta' });

    console.log("Two Parties created. Starting search...");

    // Party Alpha Search
    gameManager.handleFindMatch(p5, { username: 'LeaderAlpha', settings: { teamSize: 2, time: 10, language: 'any' } });

    console.log("Party Alpha in queue. Size:", gameManager.matchmakingQueue.length);

    // Party Beta Search
    gameManager.handleFindMatch(p7, { username: 'LeaderBeta', settings: { teamSize: 2, time: 10, language: 'any' } });

    console.log("Party Beta searched. Queue Size (Should be 0 if matched):", gameManager.matchmakingQueue.length);

    // Check for new room
    // The last created room should be 'Match ...'
    // Since IDs are random, we inspect the size of rooms map.
    console.log("Total Rooms:", gameManager.rooms.size);
    // Find the room with these players
    let matchRoom = null;
    for (const [id, r] of gameManager.rooms) {
        if (r.players.white.includes('s5') || r.players.black.includes('s5')) {
            matchRoom = r;
            console.log(`Found Match Room: ${id}`);
            break;
        }
    }

    if (matchRoom && matchRoom.players.white.length === 2 && matchRoom.players.black.length === 2) {
        console.log("✅ SUCCESS: Party vs Party match created!");
    } else {
        console.log("❌ FAILURE: Match not found or incorrect size.");
    }

}

runTests();
