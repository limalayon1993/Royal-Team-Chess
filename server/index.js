const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const GameManager = require('./gameManager');

const nodemailer = require('nodemailer');
require('dotenv').config();

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

// Email Transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: parseInt(process.env.SMTP_PORT || '465') === 465, // true for 465, false for other ports
    logger: true,
    debug: true,
    tls: {
        rejectUnauthorized: false // Helps with some shared hosting certificates
    },
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify connection on startup
transporter.verify(function (error, success) {
    if (error) {
        console.log('SMTP Connection Error:', error);
    } else {
        console.log('SMTP Server is ready to take our messages');
    }
});

app.post('/api/contact', async (req, res) => {
    const { email, subject, message } = req.body;

    try {
        await transporter.sendMail({
            from: email,
            to: process.env.EMAIL_USER || 'contact@royalteamchess.com', // Send to yourself
            subject: `[RTC Contact] ${subject}`,
            text: `From: ${email}\n\n${message}`,
            html: `<p><strong>From:</strong> ${email}</p><p><strong>Subject:</strong> ${subject}</p><p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p>`
        });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ success: false, error: error.message });
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
