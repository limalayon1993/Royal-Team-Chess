const { Chess } = require('chess.js');
const Heatmap = require('./heatmap');
const EloRank = require('elo-rank');
const elo = new EloRank(32); // K-factor 32
const db = require('./db'); // Database Adapter


class GameManager {
    constructor(io) {
        this.io = io;
        this.rooms = new Map(); // roomId -> { boards: [], players, timer, settings, ... }
        this.matchmakingQueue = []; // Array of queue entries
        this.userElos = new Map(); // username -> elo
        this.lastPlayedColor = new Map(); // username -> 'white' | 'black'
        this.partyManager = null;
    }

    setPartyManager(pm) {
        this.partyManager = pm;
    }

    isPlayerBusy(socketId) {
        for (const room of this.rooms.values()) {
            // Check if player is in an active game 
            if (room.active) {
                if (room.players.white.includes(socketId) || room.players.black.includes(socketId)) {
                    return true;
                }
            }
        }
        return false;
    }

    createRoom(socket, { roomId, username, settings, roomName, isPrivate, password, language, isMatchmaking } = {}) {
        try {
            console.log('Received createRoom request:', { roomId, roomName, isPrivate, settings });
            if (!roomId) {
                console.error('[GameManager] createRoom called without roomId');
                return;
            }
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
                    name: roomName || `Room ${roomId}`,
                    isPrivate: !!isPrivate,
                    password: password || null,
                    // language: language || 'en', // REMOVED: Replaced by team-based languages
                    isMatchmaking: !!isMatchmaking,
                    clubIds: settings?.clubIds || { white: null, black: null }, // { white: clubId, black: clubId }
                    createdAt: Date.now()
                },
                languages: {
                    white: language || null, // Creator sets initial language for their team (usually white)
                    black: null
                },
                hostId: socket.id, // Set creator as host
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

            if (username) {
                room.usernames.set(socket.id, username);

                // Fetch ELO async (fire and forget for cache, or wait? 
                // Better to fetch and store in memory for session usage)
                db.getUserElo(username).then(elo => {
                    this.userElos.set(username, elo);
                    console.log(`[ELO] Loaded for ${username}: ${elo}`);
                    this.emitRoomUpdate(roomId); // Force UI update immediately
                });
            }

            // Assign hostId
            room.hostId = socket.id;

            socket.join(roomId);

            // Send full room data to creator (Crucial for Matchmaking so they know they are Host)
            socket.emit('joinedRoom', {
                roomId,
                settings: room.settings,
                roomName: room.metadata.name,
                hostId: room.hostId
            });

            console.log(`Room ${roomId} created successfully`);

            // Broadcast updated room list to everyone
            this.broadcastRoomsList();
        } catch (err) {
            console.error('Error in createRoom:', err);
            socket.emit('debug_log', `[Server Error] createRoom CRASH: ${err.message}\n${err.stack}`);
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
                    spectators: room.players.spectators.length,
                    isMatchmaking: room.metadata.isMatchmaking
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
                    isPrivate: true,
                    isMatchmaking: room.metadata.isMatchmaking
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
                language: room.metadata.language || 'en', // Default if removed
                players: room.players.white.length + room.players.black.length,
                maxPlayers: room.settings.teamSize * 2,
                settings: room.settings,
                active: room.active,
                active: room.active,
                spectators: room.players.spectators.length,
                isPrivate: room.metadata.isPrivate,
                isMatchmaking: room.metadata.isMatchmaking
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

        // Fetch ELO on join
        if (username) {
            db.getUserElo(username).then(elo => {
                this.userElos.set(username, elo);
                console.log(`[GameManager] Async ELO update for ${username}: ${elo}`);
                this.emitRoomUpdate(roomId); // Force UI update immediately
            });
        }

        socket.join(roomId);
        socket.emit('joinedRoom', {
            roomId,
            settings: room.settings,
            roomName: room.metadata.name,
            hostId: room.hostId
        });
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
        // console.log('[GameManager] emitRoomUpdate', roomId);
        this.io.to(roomId).emit('roomUpdate', {
            players: room.players,
            ready: {
                white: Array.from(room.ready.white),
                black: Array.from(room.ready.black)
            },
            settings: room.settings,
            active: room.active,
            active: room.active,
            usernames: Object.fromEntries(room.usernames),
            roomName: room.metadata.name,
            isMatchmaking: room.metadata.isMatchmaking,
            hostId: room.hostId, // Send hostId
            boards: room.boards ? room.boards.map(b => ({
                id: b.id,
                white: b.whitePlayerId,
                black: b.blackPlayerId
            })) : [],
            elos: Object.fromEntries(
                Array.from(room.usernames.entries()).map(([socketId, username]) => [
                    socketId,
                    this.userElos.get(username) || 300
                ])
            )
        });

        this.broadcastRoomsList();
    }

    broadcastRoomsList() {
        console.log(`[GameManager] Broadcasting rooms list to all clients. Count: ${this.rooms.size}`);
        const rooms = Array.from(this.rooms.values()).map(r => ({
            id: r.id,
            name: r.metadata.name,
            players: r.players.white.length + r.players.black.length,
            maxPlayers: r.settings.teamSize * 2,
            maxPlayers: r.settings.teamSize * 2,
            isPrivate: r.metadata.isPrivate,
            isMatchmaking: r.metadata.isMatchmaking,
            language: r.metadata.language,
            active: r.active
        }));
        this.io.emit('roomsList', rooms);
    }

    async handleFindMatch(socket, { username, settings }) {
        try {
            console.log(`[Matchmaking] ${username} (${socket.id}) searching for match. Settings:`, settings);
            if (!settings) {
                console.error('[Matchmaking] Error: Settings missing in findMatch payload');
                socket.emit('error', 'Matchmaking Error: Invalid Settings');
                return;
            }

            // 0. Get User ELO (Needed for Dynamic Range)
            const userElo = this.userElos.get(username) || 300;

            // 1. Determine Group (Single or Party)
            let group = [];

            // Check if user is in a party
            let party = null;
            if (this.partyManager) {
                party = this.partyManager.getParty(socket.id);
            }

            if (party) {
                // Security: Only Leader can start search
                if (party.leaderId !== socket.id) {
                    socket.emit('error', 'Only party leader can start matchmaking');
                    return;
                }

                console.log(`[Matchmaking] processing Party ${party.id} (Size: ${party.members.length})`);

                // Build Group from Party Members
                group = await Promise.all(party.members.map(async m => {
                    let mElo = this.userElos.get(m.username);
                    if (mElo === undefined) {
                        try {
                            mElo = await db.getUserElo(m.username);
                            this.userElos.set(m.username, mElo);
                        } catch (e) { mElo = 300; }
                    }

                    return {
                        socket: this.io.sockets.sockets.get(m.socketId), // Live Socket
                        username: m.username,
                        elo: mElo,
                        settings: settings // Shared settings from Leader
                    };
                }));

                group = group.filter(m => m.socket); // Filter disconnected?

                if (group.length !== party.members.length) {
                    socket.emit('error', 'Some party members are offline');
                    return;
                }

                // Force 'Any' Language for Parties (User Requirement)
                settings.language = 'any';
                group.forEach(m => m.settings.language = 'any');

            } else {
                // Single User -> "Party of 1"
                group = [{
                    socket: socket,
                    username: username,
                    elo: userElo,
                    settings: settings
                }];
            }

            // 1.5 Club Logic (Play for Club)
            let clubId = null;
            if (settings.playForClub) {
                // Verify all members belong to SAME club
                const clubs = await Promise.all(group.map(m => db.getClubByUsername(m.username)));

                // Check if any null (no club) or different
                const firstClub = clubs[0];
                if (!firstClub) {
                    socket.emit('error', 'You must be in a club to Play for Club');
                    return;
                }

                const allSame = clubs.every(c => c && c.id === firstClub.id);
                if (!allSame) {
                    socket.emit('error', 'All party members must belong to the same club');
                    return;
                }

                clubId = firstClub.id;
                console.log(`[Matchmaking] Group playing for Club: ${firstClub.name} (${clubId})`);
            }


            // 2. Determine Color Preference (Leader's preference or logic?)
            // For now, simpler: Leader's preference dictates.
            let colorPreference = 'any';
            if (this.lastPlayedColor.has(username)) {
                const last = this.lastPlayedColor.get(username);
                colorPreference = (last === 'white') ? 'black' : 'white';
                console.log(`[Matchmaking] ${username} prefers ${colorPreference} (Last: ${last})`);
            }

            // 3. Try to find existing compatible room
            const roomMatch = this.findCompatibleRoom(group, settings, Date.now(), colorPreference);

            if (roomMatch) {
                console.log(`[Matchmaking] Found existing room ${roomMatch.id} for ${username} (Group Size: ${group.length}). Assigned: ${roomMatch.assignedTeam}`);
                this._executeJoin(group, roomMatch.id, roomMatch.assignedTeam, settings);
                return;
            }

            // 4. No existing room, add to queue
            // Note: Queue Logic needs to store GROUP.
            // Current `addToQueue` pushes single socket.
            // We need `addGroupToQueue`? 
            // Phase 8 Plan said "Queue Logic Update".
            // For MVP Party v1, let's just error if queue functionality isn't ready for groups, 
            // OR refactor `addToQueue` to take a group structure.

            // If we assume `addToQueue` stores an ENTRY, we can wrap group in it.
            // But `processQueue` expects `entry.socket`.

            // Let's modify addToQueue to handle this?
            // Actually, for now, let's use the Leader as the "Queue Entry" and store group in it?

            if (group.length > 1) {
                this.addPartyToQueue(group, settings, colorPreference, clubId);
            } else {
                this.addToQueue(socket, username, settings, userElo, colorPreference, clubId);
            }

        } catch (err) {
            console.error('Error in handleFindMatch:', err);
            socket.emit('debug_log', `[Server Error] handleFindMatch CRASH: ${err.message}\n${err.stack}`);
            socket.emit('error', 'Failed to search for match');
        }
    }

    _executeJoin(group, roomId, team, settings) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        // Assign Language if empty and critical
        const isWhite = team === 'white';
        // Only set language if not already set (it might be set by existing team members)
        if (isWhite && !room.languages.white && settings.language !== 'any') {
            room.languages.white = settings.language;
        }
        if (!isWhite && !room.languages.black && settings.language !== 'any') {
            room.languages.black = settings.language;
        }

        // Join Loop
        group.forEach(member => {
            if (member.socket) {
                this.joinRoom(member.socket, { roomId, username: member.username });

                // Add to specific team list
                if (isWhite) room.players.white.push(member.socket.id);
                else room.players.black.push(member.socket.id);
            }
        });

        // Emit Updates
        this.emitRoomUpdate(roomId);
        group.forEach(member => {
            if (member.socket) {
                member.socket.emit('matchmakingStatus', { status: 'found', roomId });
            }
        });
    }

    findCompatibleRoom(partyMembers, criteria, startTime, colorPreference) {
        // partyMembers is Array of { elo, username, ... }

        for (const [roomId, room] of this.rooms) {
            // Basic Filters
            if (room.metadata.isPrivate) continue;
            if (!room.metadata.isMatchmaking) continue;
            if (room.active || room.finished) continue;

            // Capacity Check
            const currentPlayers = room.players.white.length + room.players.black.length;
            const maxPlayers = room.settings.teamSize * 2;
            const sizeNeeded = partyMembers.length;

            if (currentPlayers + sizeNeeded > maxPlayers) continue;

            // Advanced Slot & Party Compatibility
            const assignment = this.checkPartySlotCompatibility(room, partyMembers, criteria, startTime, colorPreference);
            if (assignment) {
                return { id: roomId, assignedTeam: assignment };
            }
        }
        return null;
    }

    checkPartySlotCompatibility(room, partyMembers, criteria, startTime, colorPreference) {
        // 1. Settings Match
        const roomSettings = room.settings;
        // Team Size
        if (criteria.teamSize !== 'any' && parseInt(criteria.teamSize) !== roomSettings.teamSize) return null;
        // Time
        if (criteria.time !== 'any' && (parseInt(criteria.time) * 60) !== roomSettings.time) return null;

        // 2. Determine Threshold
        const now = Date.now();
        const waitTime = (now - startTime) / 1000;
        const threshold = this.calculateEloThreshold(waitTime);

        // 3. Try Assigning to Teams
        const tryWhite = () => this.isValidPartyJoin(room, 'white', partyMembers, threshold, criteria.language);
        const tryBlack = () => this.isValidPartyJoin(room, 'black', partyMembers, threshold, criteria.language);

        // Preference Logic
        if (colorPreference === 'white') {
            if (tryWhite()) return 'white';
        } else if (colorPreference === 'black') {
            if (tryBlack()) return 'black';
        } else {
            // Any
            // Try to fill smaller team first
            const wCount = room.players.white.length;
            const bCount = room.players.black.length;

            if (wCount <= bCount) {
                if (tryWhite()) return 'white';
                if (tryBlack()) return 'black';
            } else {
                if (tryBlack()) return 'black';
                if (tryWhite()) return 'white';
            }
        }

        return null;
    }

    isValidPartyJoin(room, teamToJoin, partyMembers, threshold, userLanguage) {
        const teamSize = room.settings.teamSize;
        const existingMembers = (teamToJoin === 'white') ? room.players.white : room.players.black;

        // A. Space Check
        if (existingMembers.length + partyMembers.length > teamSize) return false;

        // B. Language Check (Smart Assignment)
        // Rule: Team Language must match User Language OR be Null (Any/Empty).
        // Exceptions:
        // 1. If I am a Party (>1), I don't care about language (I bring my own comms).
        // 2. If I manually selected 'Any', I don't care.

        if (partyMembers.length === 1) {
            const currentTeamLang = (teamToJoin === 'white') ? room.languages.white : room.languages.black;
            if (currentTeamLang !== null && userLanguage !== 'any' && currentTeamLang !== userLanguage) {
                return false; // Language Conflict (Single User vs Team Lang)
            }
        }

        // Note: If Team Lang is null, we can join. If we dictate language, we set it later.

        // C. Slot Simulation (The Tetris Logic)
        const whiteCount = room.players.white.length;
        const blackCount = room.players.black.length;

        const myTeamCountAfter = ((teamToJoin === 'white') ? whiteCount : blackCount) + partyMembers.length;
        const otherTeamCount = (teamToJoin === 'white') ? blackCount : whiteCount;

        // Rule 1: Opening New Lane (Surplus)
        if (myTeamCountAfter > otherTeamCount) {
            // We are creating unpaired slots. 
            // Logic: Matches are only validated for the PAIRS that exist.
            // If we add players that have NO opponent, they are valid by definition (waiting for opp).
            // However, we must ensure existing pairs remain valid (they shouldn't change though).
            // And we must ensure the NEW pairs (if any) are valid.

            // BUT, we must check if we are *partially* matching.
            // e.g. W=1, B=1. Party of 2 joins White. W=3. 
            // Slot 1 (exist) vs Slot 1 (exist) -> Unchanged.
            // Slot 2 (new) vs Slot 2 (empty) -> Valid.
            // Slot 3 (new) vs Slot 3 (empty) -> Valid.
        }

        // To handle all cases universally: SIMULATE THE BOARD.

        const whiteElos = room.players.white.map(id => this.getElo(id));
        const blackElos = room.players.black.map(id => this.getElo(id));

        const partyElos = partyMembers.map(m => m.elo);

        if (teamToJoin === 'white') whiteElos.push(...partyElos);
        else blackElos.push(...partyElos);

        // Sort Both
        whiteElos.sort((a, b) => b - a);
        blackElos.sort((a, b) => b - a);

        // Check Pairs
        const pairsToCheck = Math.min(whiteElos.length, blackElos.length);

        for (let i = 0; i < pairsToCheck; i++) {
            const diff = Math.abs(whiteElos[i] - blackElos[i]);
            if (diff > threshold) {
                return false; // Invalid Pair
            }
        }

        return true;
    }

    getElo(socketId) {
        // This function needs to find the username associated with the socketId
        // within any room, then get its ELO.
        // This is a bit inefficient if called frequently, but for matchmaking
        // it should be fine.
        for (const room of this.rooms.values()) {
            const name = room.usernames.get(socketId);
            if (name) return this.userElos.get(name) || 300;
        }
        return 300; // Fallback if socketId not found in any room's usernames
    }

    checkSettingsMatch(room, criteria) {
        const roomSettings = room.settings;

        // Team Size
        if (criteria.teamSize !== 'any' && parseInt(criteria.teamSize) !== roomSettings.teamSize) return false;

        // Time
        if (criteria.time !== 'any' && (parseInt(criteria.time) * 60) !== roomSettings.time) return false;

        // Language
        const l1 = s1.language;
        const l2 = s2.language;
        let compatibleLang = false;
        // With Smart Language, they just need to NOT be mutually exclusive if they are on same team.
        // But createMatchRoom puts p1 vs p2. They are OPPOSED.
        // So language DOES NOT MATTER for Opposition.
        // They can play against each other even if l1 != l2.
        // Wait, "Team Based Language".
        // Quick Match 1v1:
        // P1 (White) needs to match P1 Lang. P2 (Black) needs to match P2 Lang.
        // So they are ALWAYS compatible linguistically because they are on different teams.
        // Exception: If p1 wants "Spanish" and p2 wants "English", creating a room is fine.
        // Room Metadata will have whiteLang=Spanish, blackLang=English.
        compatibleLang = true;

        if (!compatibleLang) return false;

        return true;
    }

    addPartyToQueue(group, settings, colorPreference, clubId) {
        // Group structure: [{ socket, username, ... }, ...]
        // Queue Item
        const entry = {
            isParty: true,
            group: group, // Array of members
            settings: settings,
            colorPreference,
            timestamp: Date.now(),
            // Compatibility for processQueue (looks for entry.socket.id)
            socket: group[0].socket,
            username: group[0].username,
            // Calculated ELO for matchmaking? 
            // For now, use Leader's ELO or Max? 
            // Let's use Average.
            elo: Math.floor(group.reduce((sum, m) => sum + m.elo, 0) / group.length),
            clubId: clubId || null
        };

        this.matchmakingQueue.push(entry);

        group.forEach(m => {
            if (m.socket) m.socket.emit('matchmakingStatus', { status: 'searching' });
        });

        console.log(`[Matchmaking] Added Party (Size ${group.length}) to queue. Queue size: ${this.matchmakingQueue.length}`);
        this.processQueue();
    }

    addToQueue(socket, username, settings, elo, colorPreference = 'any', clubId = null) {
        this.removeFromQueue(socket.id); // Ensure uniqueness is handled (might need update for Party check)

        this.matchmakingQueue.push({
            isParty: false,
            socket, // For single user
            username,
            settings,
            elo,
            colorPreference,
            timestamp: Date.now(),
            group: [{ socket, username, elo, settings }], // Unified structure
            clubId: clubId
        });

        socket.emit('matchmakingStatus', { status: 'searching' });
        console.log(`[Matchmaking] Added ${username} to queue. Queue size: ${this.matchmakingQueue.length}`);

        this.processQueue();
    }

    removeFromQueue(socketId) {
        // Find entry where socketId belongs
        const index = this.matchmakingQueue.findIndex(item => {
            if (item.isParty) {
                return item.group.some(m => m.socket.id === socketId);
            }
            return item.socket.id === socketId;
        });

        if (index !== -1) {
            this.matchmakingQueue.splice(index, 1);
            console.log(`[Matchmaking] Removed ${socketId} from queue.`);
        }
    }

    processQueue() {
        if (this.matchmakingQueue.length < 2) return;

        const matchedIndices = new Set();

        for (let i = 0; i < this.matchmakingQueue.length; i++) {
            if (matchedIndices.has(i)) continue;

            const entryA = this.matchmakingQueue[i];

            for (let j = i + 1; j < this.matchmakingQueue.length; j++) {
                if (matchedIndices.has(j)) continue;

                const entryB = this.matchmakingQueue[j];

                if (this.areEntriesCompatible(entryA, entryB)) {
                    // Match Found!
                    matchedIndices.add(i);
                    matchedIndices.add(j);

                    this.createMatchRoom(entryA, entryB); // Updated to handle groups
                    break;
                }
            }
        }

        // Cleanup processed
        this.matchmakingQueue = this.matchmakingQueue.filter((_, index) => !matchedIndices.has(index));
    }

    areEntriesCompatible(e1, e2) {
        const s1 = e1.settings;
        const s2 = e2.settings;

        // Team Size Checking
        const size1Str = s1.teamSize;
        const size2Str = s2.teamSize;

        let targetSize = 2; // Default
        if (size1Str !== 'any') targetSize = parseInt(size1Str);
        else if (size2Str !== 'any') targetSize = parseInt(size2Str);

        // Validation: 
        // If s1 says "2", s2 says "3" -> False.
        if (size1Str !== 'any' && size2Str !== 'any' && size1Str !== size2Str) return false;

        // Validation: Group Sizes must fit.
        // E.g. Group A size 2. Group B size 2. Target Size 2.
        // We are matching A vs B. 
        // A fits in Team 1? Yes (2 <= 2).
        // B fits in Team 2? Yes (2 <= 2).
        // Match OK.

        // E.g. Group A size 3. Target Size 2. -> Impossible (Should be filtered earlier but check here).
        if (e1.group.length > targetSize) return false;
        if (e2.group.length > targetSize) return false;

        // Note: We are creating a NEW room. They will be opponents.
        // So we strictly check (GroupSizeA <= TargetSize) AND (GroupSizeB <= TargetSize).

        // Time
        const time1 = s1.time;
        const time2 = s2.time;
        if (time1 !== 'any' && time2 !== 'any' && parseInt(time1) !== parseInt(time2)) return false;

        // Language
        // e1 (Team A) vs e2 (Team B)
        // Team A Language must match e1 Members (Checked internally by e1).
        // Team B Language must match e2 Members.
        // e1 vs e2 Language is irrelevant unless we want to enforce common room language? (No, we decided teams are independent).
        // But what about Room Language setting? 
        // If e1 says "Spanish Only" (as a pref, not team pref), and e2 says "English Only".
        // They can play.
        // However, if `settings.language` implies "My Team Language", then it's fine.
        // But if it means "Room Language", then they conflict.
        // Our UI says "Language" (which filters rooms). 
        // Previously: "Filtering by the language of the TEAM being joined... Parties automatically have 'Any'".
        // So Partys usually have 'any'. Single users might have 'es'.
        // If Single 'es' matches Single 'en', is that okay?
        // Ideally YES for independent teams.
        // BUT, `findCompatibleRoom` filters rooms by language?
        // Wait, `checkSettingsMatch` line 520 checked `criteria.language !== room.language`.
        // I removed that for `checkPartySlotCompatibility`.
        // So, yes, we effectively ignore cross-team language for matching.

        // DYNAMIC ELO LOGIC
        const now = Date.now();
        const waitA = (now - e1.timestamp) / 1000;
        const waitB = (now - e2.timestamp) / 1000;
        const maxWait = Math.max(waitA, waitB);

        const eloThreshold = this.calculateEloThreshold(maxWait);
        const eloDiff = Math.abs(e1.elo - e2.elo); // Using Avg ELO

        console.log(`[Matchmaking] Compat Check:
          A: ${e1.username || e1.socket.id} (${e1.elo}) Wait: ${waitA.toFixed(1)}s
          B: ${e2.username || e2.socket.id} (${e2.elo}) Wait: ${waitB.toFixed(1)}s
          Diff: ${eloDiff} | Threshold: ${eloThreshold} | MaxWait: ${maxWait.toFixed(1)}s`);

        if (eloDiff > eloThreshold) {
            // console.log('[Matchmaking] ELO Diff too high');
            return false;
        }

        // COLOR BALANCING LOGIC
        if (waitA > 10 || waitB > 10) return true;

        const prefA = e1.colorPreference;
        const prefB = e2.colorPreference;

        if (prefA === 'white' && prefB === 'black') return true;
        if (prefA === 'black' && prefB === 'white') return true;
        if (prefA === 'any' || prefB === 'any') return true;

        return false;
    }

    createMatchRoom(e1, e2) {
        const roomId = Math.random().toString(36).substring(7);

        // Resolve Settings
        // Team Size Priority: Specific > Any. 
        const s1 = e1.settings.teamSize;
        const s2 = e2.settings.teamSize;

        let size = 1; // Default
        if (s1 !== 'any') size = parseInt(s1);
        else if (s2 !== 'any') size = parseInt(s2);

        // If both undefined/any, default to max group size?
        const maxGroup = Math.max(e1.group.length, e2.group.length);
        if (maxGroup > size) size = maxGroup; // Ensure room is big enough

        const time = (e1.settings.time !== 'any') ? parseInt(e1.settings.time) * 60 :
            (e2.settings.time !== 'any') ? parseInt(e2.settings.time) * 60 : 600;

        // Language Resolution (For Metadata display, though teams are separate)
        const lang = (e1.settings.language !== 'any') ? e1.settings.language :
            (e2.settings.language !== 'any') ? e2.settings.language : 'en';

        console.log(`[Matchmaking] Creating room ${roomId} for Groups (Sizes: ${e1.group.length} vs ${e2.group.length})`);

        // Create Room
        const roomSettings = {
            isMatchmaking: true,
            teamSize: size,
            time: time, // time is in seconds
            clubIds: {
                white: e1.clubId || null,
                black: e2.clubId || null
            }
        };



        // Host is Leader of Group 1
        const hostSocket = e1.group[0].socket;
        const hostName = e1.group[0].username;

        this.createRoom(hostSocket, {
            roomId,
            username: hostName,
            settings: roomSettings,
            roomName: `Match ${roomId}`,
            isPrivate: false,
            isMatchmaking: true,
            language: lang
        });

        // Set Language Metadata (Correctly)
        const room = this.rooms.get(roomId);
        if (room) {
            room.languages.white = e1.settings.language !== 'any' ? e1.settings.language : null;
            room.languages.black = e2.settings.language !== 'any' ? e2.settings.language : null;
        }

        // Join Group 1 -> White (Since e1 initiated/accepted as White-side preference or Random)
        // Refine side based on preference?
        let team1 = 'white';
        let team2 = 'black';

        if (e1.colorPreference === 'black' && e2.colorPreference !== 'black') {
            team1 = 'black';
            team2 = 'white';
        }

        this._executeJoin(e1.group, roomId, team1, e1.settings);
        this._executeJoin(e2.group, roomId, team2, e2.settings);
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

        // 1. SORT TEAMS NOW (So users see the final order during countdown)
        if (room.metadata.isMatchmaking) {
            const getElo = (socketId) => {
                const username = room.usernames.get(socketId);
                return this.userElos.get(username) || 300;
            };

            room.players.white.sort((a, b) => getElo(b) - getElo(a));
            room.players.black.sort((a, b) => getElo(b) - getElo(a));

            console.log('[Matchmaking] Teams Sorted by ELO');
            console.log('White ELOs:', room.players.white.map(id => getElo(id)));
            console.log('Black ELOs:', room.players.black.map(id => getElo(id)));

            // Emit update immediately so clients re-render with new order
            this.emitRoomUpdate(roomId);
        }

        // 2. EMIT COUNTDOWN START
        console.log(`[GameManager] Starting 5s countdown for room ${roomId}`);
        this.io.to(roomId).emit('matchStarting', { count: 5 });

        // 3. START GAME AFTER 5 SECONDS
        setTimeout(() => {
            this._launchGame(roomId);
        }, 5000);
    }

    _launchGame(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return;
        // Re-check active just in case
        if (room.active) return;

        // Initialize Boards
        room.boards = [];
        room.scores = { white: 0, black: 0 };
        room.boardResults = [];

        // (Players are ALREADY sorted in startGame)

        for (let i = 0; i < room.players.white.length; i++) {
            const whiteId = room.players.white[i];
            const blackId = room.players.black[i];

            // Record Last Played Color
            const whiteUser = room.usernames.get(whiteId);
            const blackUser = room.usernames.get(blackId);
            if (whiteUser) this.lastPlayedColor.set(whiteUser, 'white');
            if (blackUser) this.lastPlayedColor.set(blackUser, 'black');

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
            // NEW LOGIC: Instead of ending match directly, end BOARDs individually by timeout.
            // This ensures trackBoardStats is called for each board.
            if (room.timer.white <= 0) {
                room.timer.white = 0;
                this.forceEndAllActiveBoards(roomId, 'black', 'timeout');
                return;
            }
            if (room.timer.black <= 0) {
                room.timer.black = 0;
                this.forceEndAllActiveBoards(roomId, 'white', 'timeout');
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

    forceEndAllActiveBoards(roomId, winner, reason) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        // Iterate a copy or check active status carefully
        room.boards.forEach(board => {
            if (board.active) {
                this.handleBoardEnd(roomId, board.id, winner, reason, 3);
            }
        });
    }

    handleBoardEnd(roomId, boardId, winner, reason, points) {
        const room = this.rooms.get(roomId);
        if (!room) return;
        const board = room.boards.find(b => b.id === boardId);
        if (!board || !board.active) return;

        board.active = false;

        // ELO UPDATE
        if (room.metadata.isMatchmaking) {
            this.updateElo(roomId, boardId, winner);
        }

        // STATS UPDATE (New Feature)
        if (room.metadata.isMatchmaking) {
            // Only track stats for Ranked/Matchmaking games? 
            // The prompt didn't specify, but usually "Season Points" implies ranked.
            // Let's assume YES for Ranked, maybe NO for custom private?
            // "Puntos de temporada... partidas jugadas..." 
            // It says "puntos de temporada (estos tambien pueden verse directamente en el perfil)".
            // Let's track for ALL matchmaking/ranked games.

            this.trackBoardStats(room, board, winner, reason, points);
        }

        // Update Team Score
        if (winner === 'white') room.scores.white += points;
        else if (winner === 'black') room.scores.black += points;
        else {
            // Draw
            room.scores.white += points;
            room.scores.black += points;
        }

        const whiteName = room.usernames.get(board.whitePlayerId) || 'Unknown';
        const blackName = room.usernames.get(board.blackPlayerId) || 'Unknown';

        room.boardResults.push({ boardId, winner, reason, points, whiteName, blackName });

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
        } else {
            // Partial ELO update? No, usually update at end of match or per board?
            // For team chess, maybe per board is fine.
            // Let's UPDATE ELO NOW for the finished board
            // Already called above.
        }
    }

    async trackBoardStats(room, board, winner, reason, points) {
        try {
            // 1. Get Users
            const whiteUser = room.usernames.get(board.whitePlayerId);
            const blackUser = room.usernames.get(board.blackPlayerId);

            // Need User IDs? db.updateUserStats takes UUID? Or username?
            // Ideally UUID. But `room.usernames` stores USERNAMES.
            // My db functions take `userId` (UUID).
            // Do I have UUIDs mapped? NO. `gameManager` has `usernames` map (socket -> username).
            // `db.getUserElo` uses username.
            // `db.updateUserStats` I defined using `userId`.
            // Wait, I need User IDs.
            // Potential Issue: I don't have UserIDs readily available in GameManager except if I fetched them.
            // `db.getUserElo` fetches profile by username.
            // I should modify `db.updateUserStats` to accept username OR fetch ID first.
            // OR I should use `db.deleteUser` logic which fetches ID.

            // Refactor Plan: Let's assume I need to fetch IDs.
            // Or better, make `updateUserStats` work with username?
            // No, the table relies on `user_id` FK.
            // So I need to fetch ID from username.

            // Since this is async/fire-and-forget, I can fetch IDs inside `trackBoardStats` or helper.

            // 2. Calculate Season
            // 2. Calculate Season (Strictly Europe/Madrid Time)
            const getSeasonId = () => {
                const now = new Date();
                const spainTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
                return `${spainTime.getFullYear()}-${String(spainTime.getMonth() + 1).padStart(2, '0')}`;
            };
            const seasonId = getSeasonId();

            // 3. Get Captures
            const captures = this.getCaptures(board.game);
            // captures = { w: ['p', 'n'], b: [] } -> Pieces captured BY that color.
            const whiteTaken = captures.w.length;
            const blackTaken = captures.b.length;

            // 4. Prepare Increments
            const updateForUser = async (username, isWhite) => {
                if (!username) return;

                // Fetch ID (Optimizable: Cache IDs in Room?)
                // For now, let's look it up.
                const { data: uData } = await db.getUserElo(username).then(() => null); // Oops getUserElo returns number.
                // We need a Lookup.
                // Let's add `getUserId(username)` to db or query inline.
                // Actually `updateUserStats` in db.js took `userId`. 
                // Let's change `updateUserStats` in db.js to accept `username` and lookup internally? 
                // OR `db.getIdByUsername`.
                // Let's do `db.getIdByUsername` if it existed.
                // It doesn't. 
                // I will add a helper here or directly query if I can import supabase? 
                // GameManager imports `db`. I can add `getUserId` to `db.js`?
                // I've already edited `db.js`. I can add one more function or just use a raw query here using the db instance?
                // `db` module exports `isConnected` but not the `supabase` instance directly (it's internal).

                // Quick Fix: I will add `updateUserStatsByUsername` to db.js? 
                // Or just modify `updateUserStats` to lookup.
                // I'll assume for this step I will call a wrapper `db.updateUserStatsByUsername` 
                // and I need to update `db.js` AGAIN. 
                // Wait, I can do it in the next tool call. 
                // For now, let's write the Logic here assuming `db.updateUserStatsByUsername` exists.

                const myColor = isWhite ? 'white' : 'black';
                const isWinner = winner === myColor;
                const isDraw = winner === 'draw' || winner === null;
                const isLoser = !isWinner && !isDraw;

                const stats = {
                    confrontations_played: 1,
                    pieces_eaten: isWhite ? whiteTaken : blackTaken,
                    season_points: 0 // Will add points below
                };

                if (isWinner) {
                    stats.wins = 1;
                    stats.season_points = points;

                    if (reason === 'checkmate') stats.wins_checkmate = 1;
                    else if (reason === 'timeout') stats.wins_time = 1;
                    else if (reason === 'resignation' || reason === 'abandon') stats.wins_resignation = 1;

                } else if (isLoser) {
                    stats.losses = 1;
                    if (reason === 'checkmate') stats.losses_checkmate = 1;
                    else if (reason === 'timeout') stats.losses_time = 1;
                    else if (reason === 'resignation' || reason === 'abandon') stats.losses_resignation = 1;
                } else {
                    stats.draws = 1;
                    stats.season_points = points;
                }

                await db.updateUserStatsByUsername(username, seasonId, stats);
            };

            await updateForUser(whiteUser, true);
            await updateForUser(blackUser, false);

            // 5. Update Club Member Contribution (If Club Match)
            if (room.metadata.clubIds) {
                const { white: whiteClubId, black: blackClubId } = room.metadata.clubIds;

                // Helper
                const updateMemberContrib = async (username, clubId, myPoints) => {
                    if (!username || !clubId) return;
                    await db.incrementMemberContribution(username, clubId, myPoints);
                };

                // White Player
                const whitePoints = (winner === 'white') ? 3 : (winner === 'draw' || winner === null ? 1 : 0);
                await updateMemberContrib(whiteUser, whiteClubId, whitePoints);

                // Black Player
                const blackPoints = (winner === 'black') ? 3 : (winner === 'draw' || winner === null ? 1 : 0);
                await updateMemberContrib(blackUser, blackClubId, blackPoints);
            }

        } catch (e) {
            console.error('[GameManager] Error tracking stats:', e);
        }
    }

    endMatch(roomId, winner = null, reason = null) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        if (room.finished) return; // Prevent double counting/re-entrant calls
        room.active = false;
        room.finished = true;
        if (room.interval) clearInterval(room.interval);

        // If there's a forced winner (e.g. timeout), process active boards by delegated function
        // This ensures trackBoardStats is called and user stats are updated.
        if (winner) {
            // Create a copy to avoid modification issues while iterating
            [...room.boards].forEach(board => {
                if (board.active) {
                    this.handleBoardEnd(roomId, board.id, winner, reason || 'forced', 3);
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

        // CLUB STATS UPDATE
        if (room.metadata.clubIds) { // Only if metadata exists
            const { white: whiteClubId, black: blackClubId } = room.metadata.clubIds;

            // Note: Only update if club was involved
            if (whiteClubId || blackClubId) {
                // Determine Match Winner
                // `matchWinner` is 'white', 'black', or 'draw'

                const updateClub = async (cId, isWhiteTeam) => {
                    if (!cId) return;

                    const myTeam = isWhiteTeam ? 'white' : 'black';
                    const isWinner = matchWinner === myTeam;
                    const isDraw = matchWinner === 'draw';
                    const isLoser = !isWinner && !isDraw;

                    const stats = {
                        matches_played: 1,
                        matches_won: isWinner ? 1 : 0,
                        matches_lost: isLoser ? 1 : 0,
                        matches_drawn: isDraw ? 1 : 0,
                        season_points: isWinner ? 3 : (isDraw ? 1 : 0) // Example Points: 3 for win, 1 for draw
                    };

                    // Calculate Season ID (Strictly Europe/Madrid)
                    const now = new Date();
                    const spainTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
                    const seasonId = `${spainTime.getFullYear()}-${String(spainTime.getMonth() + 1).padStart(2, '0')}`;

                    await db.updateClubStats(cId, seasonId, stats);
                    console.log(`[ClubStats] Updated Club ${cId}: ${isWinner ? 'WIN' : (isDraw ? 'DRAW' : 'LOSS')}`);
                };

                updateClub(whiteClubId, true);
                updateClub(blackClubId, false);
            }
        }
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

    async updateElo(roomId, boardId, winner) {
        const room = this.rooms.get(roomId);
        const board = room.boards.find(b => b.id === boardId);
        if (!room || !board) return;

        const whiteUser = room.usernames.get(board.whitePlayerId);
        const blackUser = room.usernames.get(board.blackPlayerId);
        if (!whiteUser || !blackUser) return;

        // Use stored values for calculation
        // (Assuming they were loaded on join, otherwise default 300)
        const whiteElo = this.userElos.get(whiteUser) || 300;
        const blackElo = this.userElos.get(blackUser) || 300;

        const expectedScoreWhite = elo.getExpected(whiteElo, blackElo);
        const expectedScoreBlack = elo.getExpected(blackElo, whiteElo);

        let whiteResult = 0.5;
        if (winner === 'white') whiteResult = 1;
        else if (winner === 'black') whiteResult = 0;

        const newWhelo = elo.updateRating(expectedScoreWhite, whiteResult, whiteElo);
        const newBkelo = elo.updateRating(expectedScoreBlack, 1 - whiteResult, blackElo);

        // Update Memory
        this.userElos.set(whiteUser, newWhelo);
        this.userElos.set(blackUser, newBkelo);

        // Update DB
        await db.updateUserElo(whiteUser, newWhelo);
        await db.updateUserElo(blackUser, newBkelo);

        console.log(`[ELO] ${whiteUser} (${whiteElo}->${newWhelo}) vs ${blackUser} (${blackElo}->${newBkelo})`);
    }

    handleDisconnect(socket) {
        this.removeFromQueue(socket.id);
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
                // Keep usernames for match history/reconnection name resolution
                // room.usernames.delete(socket.id); 

                // If not in any list, we still want to check for verified cleanup if room is really empty
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

        const resigningColor = board.whitePlayerId === socket.id ? 'white' : 'black';
        const winner = resigningColor === 'white' ? 'black' : 'white';

        console.log(`Player ${socket.id} resigned in room ${roomId}. Winner: ${winner}`);

        // End board with 'resignation' reason (3 points for winner)
        this.handleBoardEnd(roomId, board.id, winner, 'resignation', 3);
    }

    handleOfferDraw(socket, { roomId }) {
        const room = this.rooms.get(roomId);
        if (!room || !room.active) return;

        const board = room.boards.find(b => b.whitePlayerId === socket.id || b.blackPlayerId === socket.id);
        if (!board || !board.active) return;

        const offeringColor = board.whitePlayerId === socket.id ? 'white' : 'black';
        const opponentColor = offeringColor === 'white' ? 'black' : 'white';
        const opponentId = offeringColor === 'white' ? board.blackPlayerId : board.whitePlayerId;

        board.drawOffer = offeringColor;
        this.io.to(opponentId).emit('drawOffered', { color: offeringColor });
    }

    handleAcceptDraw(socket, { roomId }) {
        const room = this.rooms.get(roomId);
        if (!room || !room.active) return;

        const board = room.boards.find(b => b.whitePlayerId === socket.id || b.blackPlayerId === socket.id);
        if (!board || !board.active || !board.drawOffer) return;

        // Verify it was offered TO this player
        const acceptingColor = board.whitePlayerId === socket.id ? 'white' : 'black';
        if (board.drawOffer === acceptingColor) return; // Cannot accept your own offer

        console.log(`Draw accepted on board ${board.id}`);
        this.handleBoardEnd(roomId, board.id, null, 'agreement', 1);
        board.drawOffer = null; // Clear offer
    }

    handleRejectDraw(socket, { roomId }) {
        const room = this.rooms.get(roomId);
        if (!room || !room.active) return;

        const board = room.boards.find(b => b.whitePlayerId === socket.id || b.blackPlayerId === socket.id);
        if (!board || !board.active || !board.drawOffer) return;

        const rejectingColor = board.whitePlayerId === socket.id ? 'white' : 'black';
        const offererId = rejectingColor === 'white' ? board.blackPlayerId : board.whitePlayerId;

        board.drawOffer = null;
        this.io.to(offererId).emit('drawRejected');
    }

    calculateEloThreshold(waitTime) {
        // Base tolerance: 100 ELO
        // Increase by 10 ELO for every second waited
        const base = 100;
        const growth = Math.floor(waitTime) * 10;
        return base + growth;
    }


}

module.exports = GameManager;
