const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const GameManager = require('./gameManager');
const PartyManager = require('./partyManager');
const { initCronJobs } = require('./cronJobs');

initCronJobs();

const app = express();
app.use(cors());
app.use(express.json());

const db = require('./db');

// --- SECURITY MIDDLEWARE ---
const verifyAdmin = (req, res, next) => {
    if (!process.env.ADMIN_SECRET) {
        console.warn('[Security] ADMIN_SECRET not set in Environment! Admin endpoints disabled.');
        return res.status(503).json({ error: 'Service Unavailable: Admin Configuration Missing' });
    }
    if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
        console.warn(`[Security] Unauthorized Admin Access Attempt from ${req.ip}`);
        return res.status(403).json({ error: 'Unauthorized' });
    }
    next();
};

// Endpoint to fix Elo for new users (Bypassing RLS)
app.post('/api/fix-elo', verifyAdmin, async (req, res) => {
    const { username } = req.body;
    console.log('[API] Received request to fix Elo for:', username);
    if (!username) return res.status(400).json({ error: 'Missing username' });

    try {
        await db.updateUserElo(username, 300);
        console.log('[API] Successfully reset Elo to 300 for:', username);
        res.json({ success: true, message: 'Elo reset to 300' });
    } catch (err) {
        console.error('[API] Error fixing Elo:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to DELETE USER (Admin - Cascading)
app.post('/api/admin/delete-user', verifyAdmin, async (req, res) => {
    const { username } = req.body;
    console.log('[API] Received ADMIN request to DELETE user:', username);
    if (!username) return res.status(400).json({ error: 'Missing username' });

    try {
        const success = await db.deleteUser(username);
        if (success) {
            console.log('[API] Successfully deleted user:', username);
            res.json({ success: true, message: `User ${username} deleted.` });
        } else {
            console.warn('[API] Failed to delete user (not found or error):', username);
            res.status(404).json({ error: 'User not found or delete failed' });
        }
    } catch (err) {
        console.error('[API] Error deleting user:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to CLEANUP ZOMBIE USER (Auth without Profile)
app.post('/api/admin/cleanup-zombie', verifyAdmin, async (req, res) => {
    const { userId } = req.body;
    console.log('[API] Received request to CLEANUP ZOMBIE user:', userId);

    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    try {
        const result = await db.deleteAuthUserOnly(userId);
        if (result) {
            console.log('[API] Successfully cleaned up zombie auth user:', userId);
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Failed to delete auth user' });
        }
    } catch (err) {
        console.error('[API] Error cleaning zombie:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to FORCE DELETE BY EMAIL (Rescue)
app.post('/api/admin/force-delete-email', verifyAdmin, async (req, res) => {
    const { email } = req.body;
    console.log('[API] Received request to FORCE DELETE email:', email);

    if (!email) return res.status(400).json({ error: 'Missing email' });

    try {
        const result = await db.deleteUserByEmail(email);
        if (result) {
            res.json({ success: true, message: 'Cleanup successful' });
        } else {
            res.status(500).json({ error: 'Failed to delete user' });
        }
    } catch (err) {
        console.error('[API] Error cleaning email:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to FORCE VERIFY BY EMAIL (Rescue)
app.post('/api/admin/force-verify-email', verifyAdmin, async (req, res) => {
    const { email } = req.body;
    console.log('[API] Received request to FORCE VERIFY email:', email);

    if (!email) return res.status(400).json({ error: 'Missing email' });

    try {
        const result = await db.verifyUserByEmail(email);
        if (result) {
            res.json({ success: true, message: 'Verification successful' });
        } else {
            res.status(500).json({ error: 'Failed to verify user (Not found?)' });
        }
    } catch (err) {
        console.error('[API] Error verifying email:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- CLUB API ---

// Create Club
app.post('/api/clubs/create', async (req, res) => {
    const { name, description, logoUrl, ownerId } = req.body;
    if (!name || !ownerId) return res.status(400).json({ error: 'Missing name or owner' });

    // Validate Name availability
    const nameTaken = await db.checkClubName(name);
    if (nameTaken) return res.status(409).json({ error: 'Club name already taken' });

    // Check if user already owns/is in a club? For now, DB constraint or logic?
    // User requirement: "If user has NO club, access create page". Implies 1 club limit.
    // Check if user is in a club
    const existingClub = await db.getUserClub(ownerId);
    if (existingClub) return res.status(400).json({ error: 'User is already in a club' });

    const result = await db.createClub(name, description, logoUrl, ownerId);
    if (result.error) return res.status(500).json({ error: result.error });

    res.json({ success: true, club: result.data });
});

// Delete Club (Owner Only)
app.post('/api/clubs/delete', async (req, res) => {
    const { clubId, userId } = req.body;
    if (!clubId || !userId) return res.status(400).json({ error: 'Missing clubId or userId' });

    // Verify Ownership
    const club = await db.getClub(clubId);
    if (!club) return res.status(404).json({ error: 'Club not found' });
    if (club.owner_id !== userId) return res.status(403).json({ error: 'Unauthorized: Only owner can delete club' });

    const result = await db.deleteClub(clubId);
    if (result.error) return res.status(500).json({ error: result.error });

    res.json({ success: true });
});

// Get Club by ID
app.get('/api/clubs/:id', async (req, res) => {
    const { id } = req.params;
    const club = await db.getClub(id);
    if (!club) return res.status(404).json({ error: 'Club not found' });

    // Get Members
    const members = await db.getClubMembers(id);
    club.members = members;

    // Get Current Stats
    const stats = await db.getClubStats(id); // Defaults to current
    club.stats = stats;

    res.json(club);
});

// Get My Club (For "My Club" Button logic)
app.post('/api/clubs/my-club', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const club = await db.getUserClub(userId);
    res.json({ club }); // Returns club object or null
});

// Search Clubs
app.get('/api/clubs/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    const clubs = await db.searchClubs(q);
    res.json(clubs);
});

// Join Request
app.post('/api/clubs/join-request', async (req, res) => {
    const { clubId, userId, message } = req.body;
    const result = await db.createJoinRequest(clubId, userId, message);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json({ success: true });
});

// Get Join Requests (Owner)
app.get('/api/clubs/:id/requests', async (req, res) => {
    const { id } = req.params;
    const requests = await db.getClubJoinRequests(id);
    res.json(requests);
});

// Kick Member
app.post('/api/clubs/kick', async (req, res) => {
    const { clubId, userId, requesterId } = req.body;

    // 1. Verify Requester is Owner
    const club = await db.getClub(clubId);
    if (!club) return res.status(404).json({ error: 'Club not found' });

    if (club.owner_id !== requesterId) {
        return res.status(403).json({ error: 'Only the owner can kick members' });
    }

    // 2. Remove Member
    const result = await db.removeClubMember(clubId, userId);
    if (result.error) return res.status(500).json({ error: result.error });

    res.json({ success: true });
});

// Respond to Request
app.post('/api/clubs/requests/respond', async (req, res) => {
    const { requestId, status, clubId, userId } = req.body;
    const result = await db.respondToJoinRequest(requestId, status, clubId, userId);
    if (result.error) return res.status(500).json({ error: result.error });
    res.json({ success: true });
});

// Send Invite
app.post('/api/clubs/invite', async (req, res) => {
    const { clubId, targetUsername, senderId } = req.body;
    // Pass targetUsername as identifier
    const result = await db.createClubInvite(clubId, targetUsername, senderId);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json({ success: true });
});

// Get My Invites
app.get('/api/clubs/invites/:userId', async (req, res) => {
    const { userId } = req.params;
    const invites = await db.getUserClubInvites(userId);
    res.json(invites);
});

// Respond to Invite
app.post('/api/clubs/invites/respond', async (req, res) => {
    const { inviteId, status, clubId, userId } = req.body;
    const result = await db.respondToClubInvite(inviteId, status, clubId, userId);
    if (result.error) return res.status(500).json({ error: result.error });
    res.json({ success: true });
});

// Search Users
app.get('/api/users/search', async (req, res) => {
    const { q } = req.query;
    if (!q || q.length < 3) return res.json([]);
    const users = await db.searchUsers(q);
    res.json(users);
});


const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const gameManager = new GameManager(io);
const partyManager = new PartyManager(io, gameManager);
gameManager.partyManager = partyManager; // Fix circular dependency
gameManager.setPartyManager(partyManager);

const SERVER_VERSION = 'v1.0.0_Launch';

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

    // Party / User Status
    socket.on('requestUserStatuses', () => partyManager.sendUserSnapshot(socket));



    socket.on('disconnect', () => {
        partyManager.leaveParty(socket);
        partyManager.unregisterUser(socket);
        gameManager.handleDisconnect(socket);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('--- SERVER LAUNCHED: v1.0.0_Launch ---');
    console.log('NOTE: Admin endpoints require ADMIN_SECRET');
});
