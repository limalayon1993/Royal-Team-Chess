const { Chess } = require('chess.js');
const Heatmap = require('./heatmap');


class GameManager {
    constructor(io) {
        this.io = io;
        this.rooms = new Map(); // roomId -> { boards: [], players, timer, settings, ... }
    }

    createRoom(socket, { roomId, username, settings, roomName, isPrivate, password, language }) {
        try {
            console.log('Received createRoom request:', { roomId, roomName, isPrivate, settings });
            if (this.rooms.has(roomId)) {
                socket.emit('error', 'Room already exists');
                return;
            }

            // Default settings
            const roomSettings = {
                time: settings?.time || 600, // seconds per team
                teamSize: settings?.teamSize || 2, // players per team
                ...settings
            };

            this.rooms.set(roomId, {
                metadata: {
                    name: roomName || `Room ${roomId}`,
                    isPrivate: !!isPrivate,
                    password: password || null,
                    language: language || 'en',
                    createdAt: Date.now()
                },
                boards: [], // Array of { game, whitePlayerId, blackPlayerId }
                settings: roomSettings,
                players: {
                    white: [], // List of socketIds
                    black: [],
                    spectators: []
                },
                usernames: new Map(), // socketId -> username
                ready: { white: new Set(), black: new Set() },
                timer: { white: roomSettings.time, black: roomSettings.time },
                lastMoveTime: Date.now(),
                active: false,
                interval: null,
                scores: { white: 0, black: 0 },
                boardResults: [] // { boardId, winner, reason, points }
            });

            const room = this.rooms.get(roomId);
            if (username) room.usernames.set(socket.id, username);

            socket.join(roomId);
            socket.emit('roomCreated', roomId);
            console.log(`Room ${roomId} created successfully`);

            // Broadcast updated room list to everyone
            this.broadcastRoomsList();
        } catch (err) {
            console.error('Error in createRoom:', err);
            socket.emit('error', 'Failed to create room');
        }
    }

    getRooms(socket) {
        const roomsList = [];
        this.rooms.forEach((room, id) => {
            if (room.finished) return;
            if (!room.metadata.isPrivate) {
                roomsList.push({
                    id,
                    name: room.metadata.name,
                    language: room.metadata.language,
                    players: room.players.white.length + room.players.black.length,
                    maxPlayers: room.settings.teamSize * 2,
                    settings: room.settings,
                    active: room.active,
                    spectators: room.players.spectators.length
                });
            } else {
                // Optionally send private rooms with a lock flag, but no details if we want to hide them completely.
                // For now, let's list them but mark as locked so people can try to join if they know the password.
                roomsList.push({
                    id,
                    name: room.metadata.name,
                    language: room.metadata.language,
                    players: room.players.white.length + room.players.black.length,
                    maxPlayers: room.settings.teamSize * 2,
                    settings: room.settings,
                    active: room.active,
                    spectators: room.players.spectators.length,
                    isPrivate: true
                });
            }
        });
        console.log(`[GameManager] getRooms called. Returning ${roomsList.length} rooms.`);
        socket.emit('roomsList', roomsList);
    }

    broadcastRoomsList() {
        const roomsList = [];
        this.rooms.forEach((room, id) => {
            if (room.finished) return;
            roomsList.push({
                id,
                name: room.metadata.name,
                language: room.metadata.language,
                players: room.players.white.length + room.players.black.length,
                maxPlayers: room.settings.teamSize * 2,
                settings: room.settings,
                active: room.active,
                spectators: room.players.spectators.length,
                isPrivate: room.metadata.isPrivate
            });
        });
        console.log(`[GameManager] Broadcasting rooms list to all clients. Count: ${roomsList.length}`);
        this.io.emit('roomsList', roomsList);
    }

    updateSettings(socket, { roomId, settings }) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        // Update settings
        room.settings = { ...room.settings, ...settings };

        // Reset timer if game hasn't started
        if (!room.active) {
            room.timer = { white: room.settings.time, black: room.settings.time };
        }

        this.emitRoomUpdate(roomId);
    }

    joinRoom(socket, { roomId, username, password }) {
        const room = this.rooms.get(roomId);
        if (!room) {
            socket.emit('error', 'Room not found');
            return;
        }

        if (room.metadata.isPrivate && room.metadata.password !== password) {
            socket.emit('error', 'Incorrect password');
            return;
        }

        if (username) room.usernames.set(socket.id, username);

        socket.join(roomId);
        socket.emit('joinedRoom', { roomId, settings: room.settings, roomName: room.metadata.name });
        this.emitRoomUpdate(roomId);

        // If game is active, send current state to the reconnecting player
        if (room.active) {
            // Send gameStart to restore board mapping and myBoardId
            socket.emit('gameStart', {
                boards: room.boards.map(b => ({
                    id: b.id,
                    white: b.whitePlayerId,
                    black: b.blackPlayerId
                }))
            });

            // Send current board state
            const board = room.boards.find(b => b.whitePlayerId === socket.id || b.blackPlayerId === socket.id);
            if (board) {
                this.broadcastGameState(roomId, board); // This sends to specific players, which includes socket.id
            }

            // Send visualizer state
            this.broadcastVisualizerUpdate(roomId);
            this.broadcastSpectatorUpdate(roomId);

            // Send timer
            socket.emit('timerUpdate', room.timer);
        }

        // Broadcast update to reflect new player count in browser
        this.broadcastRoomsList();
    }

    joinTeam(socket, { roomId, team }) { // team: 'white', 'black', 'spectator'
        const room = this.rooms.get(roomId);
        if (!room) return;

        // Remove from other lists
        room.players.white = room.players.white.filter(id => id !== socket.id);
        room.players.black = room.players.black.filter(id => id !== socket.id);
        room.players.spectators = room.players.spectators.filter(id => id !== socket.id);
        room.ready.white.delete(socket.id);
        room.ready.black.delete(socket.id);

        if (team === 'white' || team === 'black') {
            if (room.players[team].length >= room.settings.teamSize) {
                socket.emit('error', 'Team full');
                return;
            }
            room.players[team].push(socket.id);
        } else {
            room.players.spectators.push(socket.id);
        }

        this.emitRoomUpdate(roomId);
    }

    leaveTeam(socket, { roomId }) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        // Remove from teams
        room.players.white = room.players.white.filter(id => id !== socket.id);
        room.players.black = room.players.black.filter(id => id !== socket.id);

        // Remove from ready
        room.ready.white.delete(socket.id);
        room.ready.black.delete(socket.id);

        // Remove from spectators
        room.players.spectators = room.players.spectators.filter(id => id !== socket.id);

        this.emitRoomUpdate(roomId);
    }

    playerReady(socket, { roomId, isReady }) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const team = room.players.white.includes(socket.id) ? 'white' :
            room.players.black.includes(socket.id) ? 'black' : null;

        if (team) {
            if (isReady) room.ready[team].add(socket.id);
            else room.ready[team].delete(socket.id);

            this.emitRoomUpdate(roomId);
        }
    }

    emitRoomUpdate(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        this.io.to(roomId).emit('roomUpdate', {
            players: room.players,
            ready: {
                white: Array.from(room.ready.white),
                black: Array.from(room.ready.black)
            },
            settings: room.settings,
            active: room.active,
            usernames: Object.fromEntries(room.usernames),
            roomName: room.metadata.name
        });

        this.broadcastRoomsList();
    }

    startGame(socket, { roomId }) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        if (room.active) return; // Prevent double start

        // Ensure equal players (basic pairing logic)
        if (room.players.white.length !== room.players.black.length) {
            socket.emit('error', 'Teams must be equal size to start');
            return;
        }

        if (room.players.white.length === 0) {
            socket.emit('error', 'Need players to start');
            return;
        }

        // Initialize Boards
        room.boards = [];
        room.scores = { white: 0, black: 0 };
        room.boardResults = [];

        for (let i = 0; i < room.players.white.length; i++) {
            const whiteId = room.players.white[i];
            const blackId = room.players.black[i];
            const game = new Chess();

            room.boards.push({
                id: i,
                game: game,
                whitePlayerId: whiteId,
                blackPlayerId: blackId,
                active: true,
                heatmap: new Heatmap(),
                analysis: { score: 0 },
                whiteTimeSpent: 0,
                blackTimeSpent: 0
            });
        }

        room.active = true;
        room.lastMoveTime = Date.now();
        this.emitRoomUpdate(roomId);

        // Start Timer Interval
        if (room.interval) clearInterval(room.interval);
        console.log(`Starting timer interval for ${roomId}`);
        room.interval = setInterval(() => {
            this.handleTimeRunOut(roomId);
        }, 1000);

        // Notify all players
        this.io.to(roomId).emit('gameStart', {
            boards: room.boards.map(b => ({
                id: b.id,
                white: b.whitePlayerId,
                black: b.blackPlayerId
            }))
        });

        // Send initial state to each board
        room.boards.forEach(board => {
            this.broadcastGameState(roomId, board);
        });
        this.broadcastVisualizerUpdate(roomId);
        this.broadcastSpectatorUpdate(roomId);
    }

    makeMove(socket, { roomId, move }) {
        const room = this.rooms.get(roomId);
        if (!room || !room.active) return;

        const board = room.boards.find(b => b.whitePlayerId === socket.id || b.blackPlayerId === socket.id);
        if (!board || !board.active) return;

        // Verify turn
        const isWhite = board.whitePlayerId === socket.id;
        const turn = board.game.turn(); // 'w' or 'b'
        if ((isWhite && turn !== 'w') || (!isWhite && turn !== 'b')) {
            return; // Not your turn
        }

        try {
            const result = board.game.move(move);
            if (result) {
                // Update Heatmap
                board.heatmap.update(board.game.fen());

                // Update Analysis
                this.analyzePosition(roomId, board.id, board.game.fen());

                // Broadcast update
                this.broadcastGameState(roomId, board);
                this.broadcastVisualizerUpdate(roomId);
                this.broadcastSpectatorUpdate(roomId);

                // Check Game Over
                if (board.game.isGameOver()) {
                    let winner = null;
                    let reason = 'draw';
                    let points = 1; // Default draw points

                    if (board.game.isCheckmate()) {
                        winner = board.game.turn() === 'w' ? 'black' : 'white';
                        reason = 'checkmate';
                        points = 3;
                    } else if (board.game.isDraw() || board.game.isStalemate() || board.game.isThreefoldRepetition()) {
                        reason = 'draw';
                        points = 1;
                    }

                    this.handleBoardEnd(roomId, board.id, winner, reason, points);
                }
            }
        } catch (e) {
            console.error('Invalid move:', e);
        }
    }

    analyzePosition(roomId, boardId, fen) {
        const room = this.rooms.get(roomId);
        if (!room) return;
        const board = room.boards.find(b => b.id === boardId);
        if (!board) return;

        // Simple material count analysis
        const game = new Chess(fen);
        let score = 0;
        const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

        game.board().forEach(row => {
            row.forEach(piece => {
                if (piece) {
                    const val = values[piece.type];
                    score += piece.color === 'w' ? val : -val;
                }
            });
        });

        board.analysis = { score };
    }

    handleTimeRunOut(roomId) {
        try {
            const room = this.rooms.get(roomId);
            if (!room || !room.active) {
                // console.log(`Timer skipped for ${roomId}: active=${room?.active}`);
                return;
            }

            const now = Date.now();
            const delta = (now - room.lastMoveTime) / 1000;
            room.lastMoveTime = now;

            let whiteToMoveCount = 0;
            let blackToMoveCount = 0;

            room.boards.forEach(b => {
                if (!b.active) return;

                if (b.game.turn() === 'w') {
                    whiteToMoveCount++;
                    b.whiteTimeSpent += delta;
                } else {
                    blackToMoveCount++;
                    b.blackTimeSpent += delta;
                }
            });

            if (whiteToMoveCount > 0) room.timer.white -= delta * whiteToMoveCount;
            if (blackToMoveCount > 0) room.timer.black -= delta * blackToMoveCount;

            // Check for timeout
            if (room.timer.white <= 0) {
                room.timer.white = 0;
                this.endMatch(roomId, 'black', 'timeout');
                return;
            }
            if (room.timer.black <= 0) {
                room.timer.black = 0;
                this.endMatch(roomId, 'white', 'timeout');
                return;
            }

            // Emit to players directly
            const notifiedSockets = new Set();
            room.boards.forEach(board => {
                [board.whitePlayerId, board.blackPlayerId].forEach(socketId => {
                    if (socketId && !notifiedSockets.has(socketId)) {
                        this.io.to(socketId).emit('timerUpdate', room.timer);
                        notifiedSockets.add(socketId);
                    }
                });
            });

            // Also emit to spectators
            const roomSockets = this.io.sockets.adapter.rooms.get(roomId);
            if (roomSockets) {
                roomSockets.forEach(socketId => {
                    if (!notifiedSockets.has(socketId)) {
                        this.io.to(socketId).emit('timerUpdate', room.timer);
                    }
                });
            }

        } catch (err) {
            console.error('Error in handleTimeRunOut:', err);
        }
    }

    handleBoardEnd(roomId, boardId, winner, reason, points) {
        const room = this.rooms.get(roomId);
        if (!room) return;
        const board = room.boards.find(b => b.id === boardId);
        if (!board || !board.active) return;

        board.active = false;

        // Update Team Score
        if (winner === 'white') room.scores.white += points;
        else if (winner === 'black') room.scores.black += points;
        else {
            // Draw
            room.scores.white += points;
            room.scores.black += points;
        }

        room.boardResults.push({ boardId, winner, reason, points });

        // Notify players
        this.io.to(roomId).emit('boardGameOver', {
            boardId,
            winner,
            reason,
            points,
            scores: room.scores
        });

        // Check if Match Over (all boards done)
        if (room.boards.every(b => !b.active)) {
            this.endMatch(roomId);
        }
    }

    endMatch(roomId, winner = null, reason = null) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        room.active = false;
        room.finished = true;
        if (room.interval) clearInterval(room.interval);

        // If there's a forced winner (e.g. timeout), process active boards
        if (winner) {
            room.boards.forEach(board => {
                if (board.active) {
                    board.active = false;
                    // User requested 2 points per board for timeout/win
                    const points = 2;

                    if (winner === 'white') room.scores.white += points;
                    else if (winner === 'black') room.scores.black += points;

                    room.boardResults.push({
                        boardId: board.id,
                        winner,
                        reason: reason || 'forced',
                        points
                    });
                }
            });
        }

        let matchWinner = winner;
        if (!matchWinner) {
            matchWinner = room.scores.white > room.scores.black ? 'white' :
                room.scores.black > room.scores.white ? 'black' : 'draw';
        }

        this.io.to(roomId).emit('matchOver', {
            winner: matchWinner,
            reason: reason || 'score',
            scores: room.scores,
            details: room.boardResults
        });
    }

    broadcastGameState(roomId, board) {
        const room = this.rooms.get(roomId);
        const state = {
            fen: board.game.fen(),
            turn: board.game.turn(),
            captures: this.getCaptures(board.game),
            boardId: board.id
        };

        // Send to specific players
        this.io.to(board.whitePlayerId).emit('gameState', state);
        this.io.to(board.blackPlayerId).emit('gameState', state);
    }

    broadcastVisualizerUpdate(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        // Calculate Averages
        const totalWhiteTime = room.boards.reduce((acc, b) => acc + b.whiteTimeSpent, 0);
        const totalBlackTime = room.boards.reduce((acc, b) => acc + b.blackTimeSpent, 0);
        const avgWhiteTime = room.boards.length > 0 ? totalWhiteTime / room.boards.length : 0;
        const avgBlackTime = room.boards.length > 0 ? totalBlackTime / room.boards.length : 0;

        const visualizerData = room.boards.map(b => {
            const whiteBurn = b.whiteTimeSpent > avgWhiteTime ? 2 : 0;
            const blackBurn = b.blackTimeSpent > avgBlackTime ? 2 : 0;

            return {
                boardId: b.id,
                heatmap: b.heatmap.grid,
                kingStatus: b.heatmap.kingStatus,
                burnLevel: { w: whiteBurn, b: blackBurn },
                analysis: b.analysis,
                captures: this.getCaptures(b.game),
                players: {
                    white: room.usernames.get(b.whitePlayerId) || 'White',
                    black: room.usernames.get(b.blackPlayerId) || 'Black'
                }
            };
        });

        this.io.to(roomId).emit('visualizerUpdate', visualizerData);
    }

    broadcastSpectatorUpdate(roomId) {
        const room = this.rooms.get(roomId);
        if (!room || room.players.spectators.length === 0) return;

        const spectatorData = room.boards.map(b => ({
            boardId: b.id,
            fen: b.game.fen(),
            white: room.usernames.get(b.whitePlayerId) || 'White',
            black: room.usernames.get(b.blackPlayerId) || 'Black',
            heatmap: b.heatmap.grid,
            kingStatus: b.heatmap.kingStatus,
            burnLevel: {
                w: b.whiteTimeSpent > (room.boards.reduce((acc, brd) => acc + brd.whiteTimeSpent, 0) / room.boards.length) ? 2 : 0,
                b: b.blackTimeSpent > (room.boards.reduce((acc, brd) => acc + brd.blackTimeSpent, 0) / room.boards.length) ? 2 : 0
            },
            analysis: b.analysis,
            captures: this.getCaptures(b.game)
        }));

        room.players.spectators.forEach(spectatorId => {
            this.io.to(spectatorId).emit('spectatorUpdate', spectatorData);
        });
    }

    getCaptures(game) {
        const history = game.history({ verbose: true });
        const captures = { w: [], b: [] };

        history.forEach(move => {
            if (move.captured) {
                captures[move.color].push(move.captured);
            }
        });
        return captures;
    }

    leaveRoom(socket) {
        this.handleDisconnect(socket);
    }

    handleDisconnect(socket) {
        this.rooms.forEach((room, roomId) => {
            // Remove from players lists
            let removed = false;
            if (room.players.white.includes(socket.id)) {
                room.players.white = room.players.white.filter(id => id !== socket.id);
                removed = true;
            }
            if (room.players.black.includes(socket.id)) {
                room.players.black = room.players.black.filter(id => id !== socket.id);
                removed = true;
            }
            if (room.players.spectators.includes(socket.id)) {
                room.players.spectators = room.players.spectators.filter(id => id !== socket.id);
                removed = true;
            }

            // Remove from ready sets
            room.ready.white.delete(socket.id);
            room.ready.black.delete(socket.id);

            // Always remove from usernames
            if (room.usernames.has(socket.id)) {
                room.usernames.delete(socket.id);
                // If not in any list, we still want to check for empty room
                if (!removed) removed = true;
            }

            if (removed) {
                // Check if room is empty (no active players or spectators)
                const totalPlayers = room.players.white.length + room.players.black.length + room.players.spectators.length;

                if (totalPlayers === 0) {
                    console.log(`Room ${roomId} is empty. Deleting...`);
                    if (room.interval) clearInterval(room.interval);
                    this.rooms.delete(roomId);
                    this.broadcastRoomsList();
                } else {
                    this.emitRoomUpdate(roomId);
                    this.broadcastRoomsList(); // Update player counts for others
                }
            }
        });
    }

    handleChat(socket, { roomId, message }) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        // Find sender role
        const role = room.players.white.includes(socket.id) ? 'white' :
            room.players.black.includes(socket.id) ? 'black' : 'spectator';

        const chatMsg = { sender: role, text: message };

        // Send only to teammates
        if (role === 'white') {
            room.players.white.forEach(id => this.io.to(id).emit('chatMessage', chatMsg));
        } else if (role === 'black') {
            room.players.black.forEach(id => this.io.to(id).emit('chatMessage', chatMsg));
        }
    }

    handleVoice(socket, { roomId, data }) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const role = room.players.white.includes(socket.id) ? 'white' :
            room.players.black.includes(socket.id) ? 'black' : null;

        if (role === 'white') {
            room.players.white.forEach(id => {
                if (id !== socket.id) this.io.to(id).emit('voiceData', data);
            });
        } else if (role === 'black') {
            room.players.black.forEach(id => {
                if (id !== socket.id) this.io.to(id).emit('voiceData', data);
            });
        }
    }

    handleResign(socket, { roomId }) {
        const room = this.rooms.get(roomId);
        if (!room || !room.active) return;

        const board = room.boards.find(b => b.whitePlayerId === socket.id || b.blackPlayerId === socket.id);
        if (!board || !board.active) return;

        const loserColor = board.whitePlayerId === socket.id ? 'white' : 'black';
        const winnerColor = loserColor === 'white' ? 'black' : 'white';

        // Resignation = 3 points for winner
        this.handleBoardEnd(roomId, board.id, winnerColor, 'resignation', 3);
    }
}

module.exports = GameManager;
