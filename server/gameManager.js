const { Chess } = require('chess.js');
const Heatmap = require('./heatmap');


class GameManager {
    constructor(io) {
        this.io = io;
        this.rooms = new Map(); // roomId -> { boards: [], players, timer, settings, ... }
    }

    createRoom(socket, { roomId, username, settings }) {
        try {
            console.log('Received createRoom request:', roomId);
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
        } catch (err) {
            console.error('Error in createRoom:', err);
            socket.emit('error', 'Failed to create room');
        }
    }

    // ... (updateSettings remains same)

    joinRoom(socket, { roomId, username }) {
        const room = this.rooms.get(roomId);
        if (!room) {
            socket.emit('error', 'Room not found');
            return;
        }
        if (username) room.usernames.set(socket.id, username);

        socket.join(roomId);
        socket.emit('joinedRoom', { roomId, settings: room.settings });
        this.emitRoomUpdate(roomId);
    }

    // ... (joinTeam, playerReady, emitRoomUpdate, startGame, makeMove, analyzePosition, handleTimeRunOut, handleBoardEnd, endMatch, broadcastGameState remain same)

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

    handleDisconnect(socket) {
        // Handle disconnect logic if needed
        // For now, just remove from ready sets
        this.rooms.forEach((room, roomId) => {
            if (room.ready.white.delete(socket.id) || room.ready.black.delete(socket.id)) {
                this.emitRoomUpdate(roomId);
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
