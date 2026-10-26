process.on('uncaughtException', (err) => { console.error('Uncaught Exception:', err); process.exit(1); });
process.on('unhandledRejection', (reason, promise) => { console.error('Unhandled Rejection at:', promise, 'reason:', reason); process.exit(1); });
process.on('exit', (code) => { console.log(`Exit code: ${code}`); });

const { io } = require('socket.io-client');
const crypto = require('crypto');

const SERVER_URL = 'http://localhost:3000';
const NUM_PLAYERS = 16;
let roomName = 'Test Encuentro ' + crypto.randomBytes(4).toString('hex');
let roomId = null;

const sockets = [];
const connectedMap = new Map();

async function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function start() {
    console.log(`Starting ${NUM_PLAYERS} bots...`);

    for (let i = 0; i < NUM_PLAYERS; i++) {
        const socket = io(SERVER_URL);
        const username = `Bot_${i}_${crypto.randomBytes(2).toString('hex')}`;
        let joined = false;

        socket.on('connect', () => {
            console.log(`${username} connected (${socket.id})`);
            connectedMap.set(socket.id, username);
            socket.emit('login', { username });

            // Host creates the room
            if (i === 0) {
                setTimeout(() => {
                    console.log('Host creating Encuentro room...');
                    const id = 'test-room-' + Date.now();
                    socket.emit('createRoom', {
                        roomId: id,
                        username: username,
                        roomName: roomName,
                        isPrivate: false,
                        settings: {
                            mode: 'encuentro',
                            teamSize: 8,
                            time: 5, // 5 seconds to test fast timeouts
                            boardsPerMatch: 4,
                            matches: 2,
                            substitutions: 4,
                            benchViewMode: 'board'
                        }
                    });
                }, 1000);
            } else {
                // Others wait and join
                setTimeout(() => {
                    socket.emit('getRooms');
                }, 3000);
            }
        });

        socket.on('roomCreated', (id) => {
            // Este evento no existe en el backend, se deja de legado por si acaso
        });

        socket.on('roomsList', (rooms) => {
            if (i > 0 && !joined) {
                const room = rooms.find(r => r.name === roomName);
                if (room) {
                    console.log(`[${username}] keys in room object:`, Object.keys(room));
                    console.log(`[${username}] room.id is:`, room.id);
                    const idToJoin = room.id || room.roomId;
                    console.log(`${username} joining room ${idToJoin}`);
                    socket.emit('joinRoom', { roomId: idToJoin, username });
                    joined = true;
                }
            }
        });

        socket.on('joinedRoom', (data) => {
            console.log(`${username} joined room successfully.`);
            if (i === 0 && !roomId) {
                console.log(`[HOST] Room ID registered: ${data.roomId}`);
                roomId = data.roomId;
            }
            setTimeout(() => {
                const team = (i % 2 === 0) ? 'white' : 'black';
                console.log(`${username} joining team ${team}`);
                socket.emit('joinTeam', { roomId: roomId || data.roomId, team });
            }, 500);
        });

        socket.on('encuentroUpdate', (state) => {
            // console.log(`[${username}] State updated: ${state.status}`);

            if (state.status === 'voting_captain') {
                // Vote for the first player of my team (we don't know teams exactly, but let's just vote for ourselves or someone)
                // We need roomData to know teams. Wait, 'roomUpdate' gives everything.
            }
        });

        socket.on('roomUpdate', (data) => {
            try {
                if (i === 0 && data.players.white.length === 8 && data.players.black.length === 8) {
                    if (data.encuentroState && data.encuentroState.status === 'lobby') {
                        console.log('Room full, host emitting startGame...');
                        socket.emit('startGame', { roomId });
                    }
                }
                if (!data.encuentroState) return;
                const state = data.encuentroState;
                const myTeam = data.players.white.includes(socket.id) ? 'white' : (data.players.black.includes(socket.id) ? 'black' : null);

                if (state.status !== 'lobby' && i === 0) {
                    console.log(`[HOST] state is now ${state.status}, myTeam=${myTeam}`);
                }

                if (!myTeam) return;

                if (state.status === 'voting_captain') {
                    // vote for myself
                    if (!socket.hasVotedCaptain && state.votes && state.votes[myTeam] && !state.votes[myTeam][socket.id]) {
                        socket.hasVotedCaptain = true;
                        console.log(`${username} voting for captain...`);
                        socket.emit('vote_captain', { roomId, votedSocketId: socket.id });
                    }
                }

                if (i === 0 && state.votes) {
                    console.log(`[HOST] Votes tally: White: ${Object.keys(state.votes.white).length}, Black: ${Object.keys(state.votes.black).length}`);
                }

                if (state.status === 'lineup' || state.status === 'break') {
                    if (state.captains[myTeam] === socket.id && (!state.lineups[myTeam] || state.lineups[myTeam].length === 0 || state.status === 'break')) {
                        if (state.status === 'break' && state.readyForNextRound && state.readyForNextRound[myTeam]) return; // already submitted in break

                        // Add local flag to prevent multiple lineup submits in the same status phase (by tracking round and tiebreaker)
                        const lineupKey = `${state.currentRound}_${state.tiebreakerLevel || 0}`;
                        if (socket.lastLineupKey === lineupKey) return;
                        socket.lastLineupKey = lineupKey;

                        console.log(`Captain ${username} submitting lineup for ${myTeam} on round ${state.currentRound} (tiebreaker ${state.tiebreakerLevel || 0})...`);
                        // Submit top 4 players by slicing the array of strings
                        const lineup = data.players[myTeam].slice(0, 4);
                        const bench = data.players[myTeam].slice(4);
                        socket.emit('submit_lineup', { roomId, lineup, bench });
                    }
                }
            } catch (err) {
                console.error(`[${username}] CRASH in roomUpdate:`, err);
                process.exit(1);
            }
        });

        socket.on('sys_message', msg => {
            console.log(`[${username}] SYS: ${msg}`);
        });

        socket.on('gameStart', (data) => {
            console.log(`${username} game started!`);
            // We can send a random move or just resign to make it fast
            const myBoard = data.boards.find(b => b.white === socket.id || b.black === socket.id);
            if (myBoard) {
                setTimeout(() => {
                    console.log(`${username} resigning on board ${myBoard.id}`);
                    socket.emit('resign', { roomId, boardId: myBoard.id });
                }, Math.random() * 2000 + 1000);
            }
        });

        socket.on('matchOver', (data) => {
            console.log(`MATCH OVER! Winner: ${data.winner}`);
            if (i === 0) {
                console.log(JSON.stringify(data, null, 2));
                setTimeout(() => {
                    process.exit(0);
                }, 1000);
            }
        });

        socket.on('error', (err) => {
            console.error(`[${username}] Error: ${err}`);
        });

        sockets.push(socket);
    }
}

start();
