
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
        console.log(`[${this.username}] received '${event}'`);
    }
}

// MOCK IO
const io = {
    sockets: {
        sockets: new Map(),
        adapter: {
            rooms: new Map()
        }
    },
    to: (room) => ({
        emit: (event, data) => console.log(`[Broadcast to ${room}] ${event}`)
    }),
    emit: (event, data) => console.log(`[Broadcast All] ${event}`)
};

// SETUP
const gameManager = new GameManager(io);
// We don't need a real PartyManager for this test, but GameManager expects one.
const partyManager = {
    getParty: () => null
};
gameManager.setPartyManager(partyManager);

async function runTest() {
    console.log("=== STARTING SURRENDER TEST ===");

    // 1. Create Users
    const p1 = new MockSocket('s1', 'Player1');
    const p2 = new MockSocket('s2', 'Player2');
    io.sockets.sockets.set('s1', p1);
    io.sockets.sockets.set('s2', p2);

    // 2. Create Room
    console.log("Creating Room...");
    gameManager.createRoom(p1, {
        roomId: 'testRoom',
        username: 'Player1',
        settings: { teamSize: 1, time: 10 },
        isMatchmaking: true
    });

    // 3. Join P2
    console.log("Joing P2...");
    gameManager.joinRoom(p2, { roomId: 'testRoom', username: 'Player2' });

    // 4. Join Teams
    console.log("Joining Teams...");
    gameManager.joinTeam(p1, { roomId: 'testRoom', team: 'white' });
    gameManager.joinTeam(p2, { roomId: 'testRoom', team: 'black' });

    // 5. Start Game
    console.log("Starting Game...");
    gameManager.startGame(p1, { roomId: 'testRoom' });

    // Wait for start
    await new Promise(r => setTimeout(r, 6000)); // 5s countdown + 1s buffer

    // Verify Active
    const room = gameManager.rooms.get('testRoom');
    if (!room.active) {
        console.error("❌ Game did not start!");
        return;
    }
    console.log("✅ Game Started. Active: " + room.active);

    // 6. SURRENDER
    console.log("Attempting Surrender (Player1)...");
    try {
        gameManager.handleResign(p1, { roomId: 'testRoom' });
        console.log("✅ Surrender handled without crash.");
    } catch (e) {
        console.error("❌ CRASH DETECTED during handleResign:", e.message);
        return; // Stop here if crashed
    }

    // 7. Verify Outcome
    // Check if board 0 is inactive and has a winner
    const board = room.boards[0];
    if (board.active === false && boardResultsContainsWinner(room, 'black', 'resignation')) {
        console.log("✅ SUCCESS: Board ended with Black win by resignation.");
    } else {
        console.log("❌ FAILURE: Board state incorrect after surrender.");
        console.log("Board Active:", board.active);
        console.log("Results:", room.boardResults);
    }
}

function boardResultsContainsWinner(room, winner, reason) {
    return room.boardResults.some(r => r.winner === winner && r.reason === reason);
}

runTest();
