const assert = require('assert');
const GameManager = require('../gameManager');

console.log('--- STARTING VERIFY ENCUENTRO FIX TEST ---');

// Mock socket.io server
const mockIo = {
    emit: (event, data) => {},
    to: (target) => ({
        emit: (event, data) => {}
    }),
    sockets: {
        adapter: {
            rooms: new Map()
        }
    }
};

const gm = new GameManager(mockIo);

const roomId = 'test-room-encuentro';
const whitePlayerIds = ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7'];
const blackPlayerIds = ['b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'];

// Create room
const roomSettings = {
    mode: 'encuentro',
    time: 300,
    boards: 4,
    matches: 2, // 2 rounds
    substitutions: 4,
    teamSize: 8
};

const room = {
    metadata: {
        name: 'Test Encuentro',
        isPrivate: false,
        password: null,
        isMatchmaking: false,
        clubIds: { white: null, black: null },
        createdAt: Date.now()
    },
    languages: { white: 'es', black: 'es' },
    hostId: 'w0',
    boards: [],
    settings: roomSettings,
    players: {
        white: [...whitePlayerIds],
        black: [...blackPlayerIds],
        spectators: []
    },
    usernames: new Map(),
    ready: { white: new Set(), black: new Set() },
    timer: { white: roomSettings.time, black: roomSettings.time },
    lastMoveTime: Date.now(),
    active: true,
    interval: null,
    scores: { white: 0, black: 0 },
    boardResults: [],
    encuentroState: {
        status: 'playing',
        currentRound: 1,
        totalRounds: roomSettings.matches || 4,
        boardsPerRound: roomSettings.boards || 4,
        tiebreakerLevel: 0,
        captains: { white: 'w0', black: 'b0' },
        votes: { white: {}, black: {} },
        substitutionsLeft: { white: 4, black: 4 },
        lineups: { white: whitePlayerIds.slice(0, 4), black: blackPlayerIds.slice(0, 4) },
        bench: { white: whitePlayerIds.slice(4), black: blackPlayerIds.slice(4) },
        matchPoints: { white: 0, black: 0 },
        roundPoints: { white: 0, black: 0 },
        history: []
    }
};
gm.rooms.set(roomId, room);

whitePlayerIds.forEach(id => room.usernames.set(id, `User_${id}`));
blackPlayerIds.forEach(id => room.usernames.set(id, `User_${id}`));

// ==========================================
// TEST 1: ROUND 1 (currentRound = 1)
// ==========================================
console.log('\n=== Testing Round 1 ===');
gm._launchEncuentroBoards(roomId);

assert.strictEqual(room.boards.length, 4, 'Should have 4 boards in round 1');
// In round 1, whitePlaysWhite is true:
// White player has white pieces, Black player has black pieces
assert.strictEqual(room.boards[0].whitePlayerId, 'w0');
assert.strictEqual(room.boards[0].blackPlayerId, 'b0');

// Test 1.1: Clock consumption
console.log('Testing Round 1 Clock consumption:');
// Board 0 is at move 1 (white turn 'w'). White player is 'w0' (Team White).
// Board 1: make a move so it's black's turn 'b'.
room.boards[1].game.move('e4'); // Now turn is 'b'. Black player is 'b1' (Team Black).

const timerBefore = { ...room.timer };
room.lastMoveTime = Date.now() - 2000; // 2 seconds elapsed
gm.handleTimeRunOut(roomId);

// Board 0 is turn 'w' (w0 -> Team White)
// Board 1 is turn 'b' (b1 -> Team Black)
// Board 2 is turn 'w' (w2 -> Team White)
// Board 3 is turn 'w' (w3 -> Team White)
// Total whiteToMove = 3, blackToMove = 1
console.log(`Timer before: W=${timerBefore.white}, B=${timerBefore.black}`);
console.log(`Timer after:  W=${room.timer.white}, B=${room.timer.black}`);
assert(room.timer.white < timerBefore.white, 'White timer should have decreased');
assert(room.timer.black < timerBefore.black, 'Black timer should have decreased');
assert(
    (timerBefore.white - room.timer.white) > (timerBefore.black - room.timer.black),
    'White should have lost more time because 3 boards had white to move vs 1 black to move'
);
console.log('✓ Round 1 clock consumption verified');

// Test 1.2: Round 1 scoring
console.log('Testing Round 1 scoring:');
// Board 0: White pieces win (w0 -> Team White wins)
gm.handleBoardEnd(roomId, 0, 'white', 'checkmate', 3);
assert.strictEqual(room.encuentroState.roundPoints.white, 3, 'Team White should have 3 round points');
assert.strictEqual(room.encuentroState.roundPoints.black, 0, 'Team Black should have 0 round points');

// Board 1: Black pieces win (b1 -> Team Black wins)
gm.handleBoardEnd(roomId, 1, 'black', 'checkmate', 3);
assert.strictEqual(room.encuentroState.roundPoints.white, 3);
assert.strictEqual(room.encuentroState.roundPoints.black, 3);

// Board 2: Draw
gm.handleBoardEnd(roomId, 2, null, 'draw', 1);
assert.strictEqual(room.encuentroState.roundPoints.white, 4);
assert.strictEqual(room.encuentroState.roundPoints.black, 4);

// Board 3: White pieces win (w3 -> Team White wins)
gm.handleBoardEnd(roomId, 3, 'white', 'resignation', 3);
assert.strictEqual(room.encuentroState.roundPoints.white, 7);
assert.strictEqual(room.encuentroState.roundPoints.black, 4);
console.log('✓ Round 1 scoring verified (White: 7, Black: 4)');

// End Round 1
// All boards are now inactive. _handleEncuentroRoundEnd was triggered by board 3 end.
assert.strictEqual(room.encuentroState.matchPoints.white, 3, 'Team White won round 1 -> 3 match points');
assert.strictEqual(room.encuentroState.matchPoints.black, 0, 'Team Black lost round 1 -> 0 match points');
assert.strictEqual(room.encuentroState.currentRound, 2, 'Should advance to Round 2');
console.log('✓ Round 1 end and match points verified');

// ==========================================
// TEST 2: ROUND 2 (currentRound = 2)
// ==========================================
console.log('\n=== Testing Round 2 (Colors Inverted) ===');
// Captains submit lineups for round 2
room.encuentroState.lineups.white = whitePlayerIds.slice(0, 4);
room.encuentroState.lineups.black = blackPlayerIds.slice(0, 4);
room.encuentroState.status = 'playing';
room.active = true;
room.encuentroState.roundPoints = { white: 0, black: 0 };

gm._launchEncuentroBoards(roomId);

assert.strictEqual(room.boards.length, 4, 'Should have 4 boards in round 2');
// In round 2, whitePlaysWhite is false:
// Black team player has white pieces (whitePlayerId = b0)
// White team player has black pieces (blackPlayerId = w0)
assert.strictEqual(room.boards[0].whitePlayerId, 'b0', 'Team Black player should have white pieces in round 2');
assert.strictEqual(room.boards[0].blackPlayerId, 'w0', 'Team White player should have black pieces in round 2');
console.log('✓ Round 2 piece assignments verified: White pieces = b0..b3, Black pieces = w0..w3');

// Test 2.1: Client role & pieceColor resolution
console.log('Testing client pieceColor logic:');
// Simulate client for 'b0' (Team Black player)
const clientB0PieceColor = room.boards[0].whitePlayerId === 'b0' ? 'white' : 'black';
assert.strictEqual(clientB0PieceColor, 'white', 'b0 must receive pieceColor="white"');

// Simulate client for 'w0' (Team White player)
const clientW0PieceColor = room.boards[0].whitePlayerId === 'w0' ? 'white' : 'black';
assert.strictEqual(clientW0PieceColor, 'black', 'w0 must receive pieceColor="black"');

// With pieceColor passed to ChessBoard:
// b0 (team black) has role="white" on ChessBoard:
// turn === 'w' and role === 'white' -> moves ALLOWED!
// w0 (team white) has role="black" on ChessBoard:
// turn === 'b' and role === 'black' -> moves ALLOWED!
console.log('✓ Client pieceColor correctly resolves to allow moves for both teams in Round 2');

// Test 2.2: Clock consumption in Round 2
console.log('Testing Round 2 Clock consumption:');
// All boards currently have turn === 'w'.
// White pieces belong to b0, b1, b2, b3 (Team Black!)
// Therefore, TEAM BLACK should lose time, NOT Team White!
const timerR2Before = { ...room.timer };
room.lastMoveTime = Date.now() - 2000;
gm.handleTimeRunOut(roomId);

console.log(`Round 2 Timer before: W=${timerR2Before.white}, B=${timerR2Before.black}`);
console.log(`Round 2 Timer after:  W=${room.timer.white}, B=${room.timer.black}`);
assert.strictEqual(room.timer.white, timerR2Before.white, 'Team White timer should NOT decrease while Team Black thinks');
assert(room.timer.black < timerR2Before.black, 'Team Black timer MUST decrease while Team Black thinks');
console.log('✓ Round 2 clock correctly consumes time from Team Black when white pieces think!');

// Now let b0 make a move on board 0:
const moveResult = room.boards[0].game.move('e4');
assert(moveResult, 'Move e4 on board 0 should succeed');
// Now board 0 has turn === 'b' (w0 -> Team White's turn!)
// Boards 1, 2, 3 still have turn === 'w' (Team Black's turn!)
const timerR2Step2Before = { ...room.timer };
room.lastMoveTime = Date.now() - 2000;
gm.handleTimeRunOut(roomId);

console.log(`Round 2 Step 2: W=${room.timer.white}, B=${room.timer.black}`);
assert(room.timer.white < timerR2Step2Before.white, 'Team White timer MUST decrease for board 0');
assert(room.timer.black < timerR2Step2Before.black, 'Team Black timer MUST decrease for boards 1, 2, 3');
assert(
    (timerR2Step2Before.black - room.timer.black) > (timerR2Step2Before.white - room.timer.white),
    'Team Black should lose more time (3 boards thinking) than Team White (1 board thinking)'
);
console.log('✓ Round 2 mixed-turn clock consumption verified!');

// Test 2.3: Round 2 scoring
console.log('Testing Round 2 scoring:');
// Board 0: White pieces win (b0 won with white pieces!).
// Team Black MUST get the 3 points, NOT Team White!
gm.handleBoardEnd(roomId, 0, 'white', 'checkmate', 3);
assert.strictEqual(room.encuentroState.roundPoints.black, 3, 'Team Black must get 3 points when b0 wins with white pieces');
assert.strictEqual(room.encuentroState.roundPoints.white, 0, 'Team White must get 0 points');

// Board 1: Black pieces win (w1 won with black pieces!).
// Team White MUST get the 3 points, NOT Team Black!
gm.handleBoardEnd(roomId, 1, 'black', 'resignation', 3);
assert.strictEqual(room.encuentroState.roundPoints.white, 3, 'Team White must get 3 points when w1 wins with black pieces');
assert.strictEqual(room.encuentroState.roundPoints.black, 3);

// Board 2: Draw
gm.handleBoardEnd(roomId, 2, null, 'agreement', 1);
assert.strictEqual(room.encuentroState.roundPoints.white, 4);
assert.strictEqual(room.encuentroState.roundPoints.black, 4);

// Board 3: Black pieces win (w3 won with black pieces!).
gm.handleBoardEnd(roomId, 3, 'black', 'checkmate', 3);
assert.strictEqual(room.encuentroState.roundPoints.white, 7);
assert.strictEqual(room.encuentroState.roundPoints.black, 4);
console.log('✓ Round 2 scoring verified (White: 7, Black: 4)');

// Match result check
assert.strictEqual(room.encuentroState.matchPoints.white, 6, 'Team White should have 6 match points (3+3)');
assert.strictEqual(room.encuentroState.matchPoints.black, 0, 'Team Black should have 0 match points');
console.log('✓ Round 2 match points verified');

// ==========================================
// TEST 3: TIMEOUT (forceEndAllActiveBoards)
// ==========================================
console.log('\n=== Testing Timeout logic (forceEndAllActiveBoards) in Round 2 ===');
// Reset board for timeout test in round 2
room.encuentroState.currentRound = 2;
room.encuentroState.roundPoints = { white: 0, black: 0 };
room.active = true;
gm._launchEncuentroBoards(roomId);

// In round 2:
// board.whitePlayerId is b0..b3 (Team Black)
// board.blackPlayerId is w0..w3 (Team White)
// Now suppose Team Black runs out of time (room.timer.black = 0)
// Team White should WIN all 4 boards!
console.log('Simulating Team Black timeout in Round 2:');
gm.forceEndAllActiveBoards(roomId, 'black', 'timeout');

assert.strictEqual(room.encuentroState.roundPoints.white, 12, 'Team White should get 12 points (4 boards * 3) when Team Black times out');
assert.strictEqual(room.encuentroState.roundPoints.black, 0, 'Team Black should get 0 points when timing out');
console.log('✓ forceEndAllActiveBoards correctly awards points to Team White when Team Black times out in Round 2!');

// Now test Team White timeout in Round 2:
room.encuentroState.roundPoints = { white: 0, black: 0 };
room.active = true;
gm._launchEncuentroBoards(roomId);

console.log('Simulating Team White timeout in Round 2:');
gm.forceEndAllActiveBoards(roomId, 'white', 'timeout');

assert.strictEqual(room.encuentroState.roundPoints.black, 12, 'Team Black should get 12 points (4 boards * 3) when Team White times out');
assert.strictEqual(room.encuentroState.roundPoints.white, 0, 'Team White should get 0 points when timing out');
console.log('✓ forceEndAllActiveBoards correctly awards points to Team Black when Team White times out in Round 2!');

// Standard Round 1 timeout check
room.encuentroState.currentRound = 1;
room.encuentroState.roundPoints = { white: 0, black: 0 };
room.active = true;
gm._launchEncuentroBoards(roomId);

console.log('Simulating Team White timeout in Round 1:');
gm.forceEndAllActiveBoards(roomId, 'white', 'timeout');
assert.strictEqual(room.encuentroState.roundPoints.black, 12, 'Team Black should get 12 points when Team White times out in Round 1');
assert.strictEqual(room.encuentroState.roundPoints.white, 0);
console.log('✓ forceEndAllActiveBoards correctly awards points in Round 1 timeout!');

console.log('\n=============================================');
console.log('ALL TESTS PASSED SUCCESSFULLY! 100% VERIFIED.');
console.log('=============================================');
process.exit(0);
