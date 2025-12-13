const { v4: uuidv4 } = require('uuid');

class PartyManager {
    constructor(io, gameManager) {
        this.io = io;
        this.gameManager = gameManager;
        this.parties = new Map(); // partyId -> { leaderId, members: [socketId], pendingInvites: [] }
        this.socketToParty = new Map(); // socketId -> partyId
        this.onlineUsers = new Map(); // username -> socketId
        this.connectedUsers = new Map(); // socketId -> username
        this.userMap = new Map(); // userId -> { socketId, username, status }

        this.registerUser = this.registerUser.bind(this);
    }

    registerUser(socket, userData) {
        // userData can be string (legacy) or object { username, userId }
        const username = typeof userData === 'object' ? userData.username : userData;
        const userId = typeof userData === 'object' ? userData.userId : null;

        this.connectedUsers.set(socket.id, username);
        this.onlineUsers.set(username.toLowerCase(), socket.id);

        // CHECK FOR EXISTING PARTY MEMBERSHIP (Reconnection Fix)
        // If this user was in a party but disconnected, their socketId in party.members is stale.
        // We find the party by username and update the socket ID.
        for (const [pId, party] of this.parties.entries()) {
            const memberIndex = party.members.findIndex(m => m.username === username);
            if (memberIndex !== -1) {
                // Found them! Update socket ID
                const oldSocketId = party.members[memberIndex].socketId;

                // If they were leader, update leaderId
                if (party.leaderId === oldSocketId) {
                    party.leaderId = socket.id;
                    console.log(`[Party] Leader ${username} reconnected. Updated LeaderID.`);
                }

                party.members[memberIndex].socketId = socket.id;

                // Map new socket to party
                this.socketToParty.set(socket.id, pId);

                // Re-join socket room
                socket.join(pId);

                console.log(`[Party] ${username} reconnected to Party ${pId}`);

                // Broadcast update so client has correct Leader ID
                this.emitPartyUpdate(pId);
                break;
            }
        }

        if (userId) {
            this.userMap.set(userId, { socketId: socket.id, username, status: 'online' });

            // Broadcast online status to everyone
            this.io.emit('userStatusUpdate', { userId, status: 'online' });

            // Send snapshot of current online users to the new user
            const currentStatuses = {};
            for (const [uid, data] of this.userMap.entries()) {
                if (uid !== userId) {
                    currentStatuses[uid] = data.status;
                }
            }
            socket.emit('initialUserStatuses', currentStatuses);

            console.log(`[PartyManager] User registered: ${username} (${userId}) - Online`);
        }
    }

    sendUserSnapshot(socket) {
        // Send snapshot of current online users to a specific user
        const currentStatuses = {};
        for (const [uid, data] of this.userMap.entries()) {
            // Include themselves? usually no need, but consistent is fine
            currentStatuses[uid] = data.status;
        }
        socket.emit('initialUserStatuses', currentStatuses);
    }

    updateUserStatus(socketId, status) {
        for (const [uid, data] of this.userMap.entries()) {
            if (data.socketId === socketId) {
                data.status = status;
                this.io.emit('userStatusUpdate', { userId: uid, status });
                break;
            }
        }
    }

    unregisterUser(socket) {
        const username = this.connectedUsers.get(socket.id);
        if (username) {
            // Only remove from onlineUsers if the ID matches (prevent overwriting a NEW connection from the same user)
            if (this.onlineUsers.get(username.toLowerCase()) === socket.id) {
                this.onlineUsers.delete(username.toLowerCase());
            }
            this.connectedUsers.delete(socket.id);
        }

        // Update userMap status, but double check we aren't overwriting a new active session
        for (const [uid, data] of this.userMap.entries()) {
            if (data.socketId === socket.id) {
                // We found the entry for the disconnecting socket.
                // Check if this user has re-connected (is present in onlineUsers with a DIFFERENT socket)
                const currentLiveSocket = this.onlineUsers.get(data.username?.toLowerCase());

                if (currentLiveSocket && currentLiveSocket !== socket.id) {
                    // User is actually ONLINE on a new socket!
                    console.log(`[Party] keeping ${data.username} ONLINE (switched socket ${socket.id} -> ${currentLiveSocket}).`);
                    data.socketId = currentLiveSocket;
                    data.status = 'online';
                } else {
                    // Truly offline
                    console.log(`[PartyManager] Marking user ${data.username} (${uid}) as OFFLINE due to disconnect.`);
                    data.status = 'offline';
                    this.io.emit('userStatusUpdate', { userId: uid, status: 'offline' });
                }
                break;
            }
        }
    }

    findSocketByUsername(username) {
        if (!username || typeof username !== 'string') return null;
        const id = this.onlineUsers.get(username.toLowerCase());
        return id ? this.io.sockets.sockets.get(id) : null;
    }

    createParty(socket, username) {
        if (this.socketToParty.has(socket.id)) {
            console.log(`[Party] ${username} tried to create party but is already in one.`);
            return;
        }

        const partyId = uuidv4();
        const party = {
            id: partyId,
            leaderId: socket.id,
            members: [{ socketId: socket.id, username, isReady: true }],
            invited: [],
            settings: { size: 2 }, // Default
            isSearching: false
        };

        this.parties.set(partyId, party);
        this.socketToParty.set(socket.id, partyId);
        socket.join(partyId);

        console.log(`[Party] Created ${partyId} by ${username}`);
        this.emitPartyUpdate(partyId);
    }

    handleInvite(socket, targetUsername) {
        console.log(`[Party] handleInvite: ${socket.id} inviting ${targetUsername}`);
        // Log the onlineUsers keys to see what we have
        // console.log('Current Online Users:', Array.from(this.onlineUsers.keys()));

        const partyId = this.socketToParty.get(socket.id);
        if (!partyId) {
            console.log('[Party] handleInvite: Sender has no party');
            return;
        }

        const party = this.parties.get(partyId);
        if (party.leaderId !== socket.id) return;

        if (party.members.length >= 4) return;

        const targetSocket = this.findSocketByUsername(targetUsername);

        if (targetSocket) {
            // Check if user is busy (Playing a game)
            if (this.gameManager.isPlayerBusy(targetSocket.id)) {
                socket.emit('error', `${targetUsername} is currently playing a game`);
                return;
            }

            // Avoid duplicates
            if (!party.invited.includes(targetUsername)) {
                party.invited.push(targetUsername);
            }
            this.emitPartyUpdate(partyId);

            // Send Invitation
            const leaderName = party.members.find(m => m.socketId === party.leaderId)?.username;
            this.io.to(targetSocket.id).emit('partyInvitation', {
                partyId,
                from: leaderName
            });
            console.log(`[Party] Invite sent from ${leaderName} to ${targetUsername}`);
        } else {
            socket.emit('error', `${targetUsername} is offline`);
        }
    }

    handleJoinParty(socket, { partyId, username }) {
        const party = this.parties.get(partyId);
        if (!party) {
            socket.emit('error', 'Party not found');
            return;
        }

        if (party.members.length >= 4) {
            socket.emit('error', 'Party is full');
            return;
        }

        if (this.socketToParty.has(socket.id)) this.leaveParty(socket);

        party.members.push({ socketId: socket.id, username, isReady: true });
        this.socketToParty.set(socket.id, partyId);

        party.invited = party.invited.filter(u => u !== username);

        socket.join(partyId);
        this.emitPartyUpdate(partyId);
        console.log(`[Party] ${username} joined ${partyId}`);
    }

    leaveParty(socket) {
        const partyId = this.socketToParty.get(socket.id);
        if (!partyId) return;

        const party = this.parties.get(partyId);
        if (!party) return;

        party.members = party.members.filter(m => m.socketId !== socket.id);
        this.socketToParty.delete(socket.id);
        socket.leave(partyId);

        if (party.members.length === 0) {
            this.parties.delete(partyId);
            console.log(`[Party] ${partyId} dissolved`);
        } else {
            if (party.leaderId === socket.id) {
                party.leaderId = party.members[0].socketId;
            }
            this.emitPartyUpdate(partyId);
        }
    }

    handlePartyChat(socket, message) {
        const partyId = this.socketToParty.get(socket.id);
        if (!partyId) return;

        this.io.to(partyId).emit('partyMessage', { sender: socket.id, text: message });
    }

    emitPartyUpdate(partyId) {
        const party = this.parties.get(partyId);
        if (!party) return;

        this.io.to(partyId).emit('partyUpdate', party);
    }

    getPartyIdForUser(socketId) {
        return this.socketToParty.get(socketId);
    }

    getParty(socketId) {
        const id = this.socketToParty.get(socketId);
        return id ? this.parties.get(id) : null;
    }

    handleProposeParty(socket, targetUsername) {
        const senderName = this.connectedUsers.get(socket.id);
        if (!senderName) return;

        console.log(`[Party] ${senderName} proposing party to ${targetUsername}`);

        const targetSocket = this.findSocketByUsername(targetUsername);
        if (!targetSocket) {
            socket.emit('error', `${targetUsername} is offline`);
            return;
        }

        if (this.gameManager.isPlayerBusy(targetSocket.id)) {
            socket.emit('error', `${targetUsername} is currently playing`);
            return;
        }

        // Check if sender is already in party? 
        // If so, fallback to normal invite? 
        // No, client logic handles that (only calls propose if !party).
        // But for safety:
        if (this.socketToParty.has(socket.id)) {
            this.handleInvite(socket, targetUsername);
            return;
        }

        // Send Proposal
        this.io.to(targetSocket.id).emit('partyProposal', {
            from: senderName,
            fromUsername: senderName // consistent field
        });
        console.log(`[Party] Proposal sent to ${targetUsername}`);
    }

    handleAcceptPartyProposal(socket, { senderUsername }) {
        socket.emit('debug_log', `[Server] handleAcceptPartyProposal: User ${this.connectedUsers.get(socket.id)} accepted proposal from ${senderUsername}`);

        const targetName = this.connectedUsers.get(socket.id);
        const senderSocket = this.findSocketByUsername(senderUsername);

        if (!senderSocket) {
            socket.emit('error', 'Sender is no longer online');
            socket.emit('debug_log', `[Server] Error: senderSocket not found for ${senderUsername}`);
            return;
        }

        socket.emit('debug_log', `[Server] Found senderSocket: ${senderSocket.id}`);

        // Create Party for Sender
        // We can reuse createParty but we need to inject the member immediately to avoid race conditions?
        // Let's manually create to be safe and atomic.

        if (this.socketToParty.has(senderSocket.id)) {
            socket.emit('debug_log', `[Server] Sender ${senderUsername} is already in party. Joining...`);
            // Sender joined another party in the meantime?
            // Join that party instead?
            // For now, error or try to join.
            // Let's try to join.
            this.handleJoinParty(socket, { partyId: this.socketToParty.get(senderSocket.id), username: targetName });
            return;
        }

        const partyId = uuidv4();
        const party = {
            id: partyId,
            leaderId: senderSocket.id,
            members: [
                { socketId: senderSocket.id, username: senderUsername, isReady: true },
                { socketId: socket.id, username: targetName, isReady: true }
            ],
            invited: [],
            settings: { size: 2 },
            isSearching: false
        };

        this.parties.set(partyId, party);

        // Update maps and join rooms
        this.socketToParty.set(senderSocket.id, partyId);
        this.socketToParty.set(socket.id, partyId);

        senderSocket.join(partyId);
        socket.join(partyId);

        console.log(`[Party] Created ${partyId} via Proposal (${senderUsername} + ${targetName})`);
        this.emitPartyUpdate(partyId);
        socket.emit('debug_log', `[Server] Success! Party ${partyId} created.`);
    }
}

module.exports = PartyManager;
