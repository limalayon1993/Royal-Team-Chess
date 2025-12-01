const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const GameManager = require('./gameManager');

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

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('createRoom', (data) => gameManager.createRoom(socket, data));
    socket.on('joinRoom', (data) => gameManager.joinRoom(socket, data));
    socket.on('joinTeam', (data) => gameManager.joinTeam(socket, data));
    socket.on('updateSettings', (data) => gameManager.updateSettings(socket, data));
    socket.on('startGame', (data) => gameManager.startGame(socket, data));
    socket.on('playerReady', (data) => gameManager.playerReady(socket, data));
    socket.on('makeMove', (data) => gameManager.makeMove(socket, data));
    socket.on('sendChat', (data) => gameManager.handleChat(socket, data));
    socket.on('voiceData', (data) => gameManager.handleVoice(socket, data));
    socket.on('resign', (data) => gameManager.handleResign(socket, data));
    socket.on('disconnect', () => gameManager.handleDisconnect(socket));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
