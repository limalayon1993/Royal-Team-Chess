const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const GameManager = require('./gameManager');
const PartyManager = require('./partyManager');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const gameManager = new GameManager(io);
const partyManager = new PartyManager(io, gameManager);
gameManager.setPartyManager(partyManager);

const SERVER_VERSION = 'v_DEBUG_Matchmaking_' + Date.now();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.emit('server_version', SERVER_VERSION);
    socket.emit('debug_log', `[Server] Connected to ${SERVER_VERSION}`);

    // User Registration (for Parties/Invites)
    socket.on('registerUser', (username) => {
        try {
            partyManager.registerUser(socket, username);
        } catch (e) {
            console.error('[Server] CRASH PREVENTED in registerUser:', e);
        }
    });

    // Party Events
    socket.on('createParty', (data) => {
        console.log('[Server] createParty received:', data);
        try {
            if (!data || !data.username) {
                console.error('[Server] createParty missing username!');
                // partyManager.createParty handles this? No, it expects string.
            }
            partyManager.createParty(socket, data?.username);
        } catch (e) {
            console.error('[Server] CRASH PREVENTED in createParty:', e);
        }
    });
    socket.on('inviteToParty', (data) => {
        try {
            partyManager.handleInvite(socket, data.targetUsername);
        } catch (e) {
            console.error('[Server] CRASH PREVENTED in inviteToParty:', e);
        }
    });
    socket.on('joinParty', (data) => partyManager.handleJoinParty(socket, data));
    socket.on('leaveParty', () => partyManager.leaveParty(socket));
    socket.on('partyChat', (data) => partyManager.handlePartyChat(socket, data));

    // Lazy Party Creation
    socket.on('proposeParty', (data) => {
        try {
            partyManager.handleProposeParty(socket, data.targetUsername);
        } catch (e) {
            console.error('[Server] CRASH PREVENTED in proposeParty:', e);
        }
    });
    socket.on('acceptPartyProposal', (data) => {
        try {
            partyManager.handleAcceptPartyProposal(socket, data);
        } catch (e) {
            console.error('[Server] CRASH PREVENTED in acceptPartyProposal:', e);
        }
    });

    // Game Events
    socket.on('createRoom', (data) => {
        try {
            gameManager.createRoom(socket, data);
        } catch (e) {
            console.error('[Server] CRASH PREVENTED in createRoom:', e);
        }
    });
    socket.on('joinRoom', (data) => {
        try {
            gameManager.joinRoom(socket, data);
        } catch (e) {
            console.error('[Server] CRASH PREVENTED in joinRoom:', e);
        }
    });
    socket.on('joinTeam', (data) => gameManager.joinTeam(socket, data));
    socket.on('leaveTeam', (data) => gameManager.leaveTeam(socket, data));
    socket.on('updateSettings', (data) => gameManager.updateSettings(socket, data));
    socket.on('startGame', (data) => gameManager.startGame(socket, data));
    socket.on('playerReady', (data) => gameManager.playerReady(socket, data));
    socket.on('makeMove', (data) => gameManager.makeMove(socket, data));
    socket.on('sendChat', (data) => gameManager.handleChat(socket, data));
    socket.on('voiceData', (data) => gameManager.handleVoice(socket, data));
    socket.on('resign', (data) => gameManager.handleResign(socket, data));
    socket.on('offerDraw', (data) => gameManager.handleOfferDraw(socket, data));
    socket.on('acceptDraw', (data) => gameManager.handleAcceptDraw(socket, data));
    socket.on('rejectDraw', (data) => gameManager.handleRejectDraw(socket, data));
    socket.on('getRooms', () => gameManager.getRooms(socket));
    socket.on('findMatch', (data) => gameManager.handleFindMatch(socket, data));
    socket.on('cancelMatchmaking', () => gameManager.removeFromQueue(socket.id));
    socket.on('leaveRoom', () => gameManager.leaveRoom(socket));

    socket.on('disconnect', () => {
        partyManager.leaveParty(socket);
        partyManager.unregisterUser(socket);
        gameManager.handleDisconnect(socket);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
