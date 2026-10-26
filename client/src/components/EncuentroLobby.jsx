import React, { useState, useEffect, useRef } from 'react';
import { Users, Clock, Play, Mic, MicOff, Crown, Info } from 'lucide-react';
import { translations } from '../translations';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { AudioQueue } from '../utils/AudioQueue';

export function EncuentroLobby({ socket, roomId, roomName, settings, players, isCreator, language = 'en', onLeave, usernames = {}, elos = {}, encuentroState, startingCountdown }) {
    console.log('EncuentroLobby rendered with settings:', settings, 'state:', encuentroState);
    const [micOn, setMicOn] = useState(false);

    useVoiceRecorder(socket, roomId, micOn);

    const audioQueueRef = useRef(new AudioQueue());
    const t = translations[language];

    const [countdown, setCountdown] = useState(null);
    const [breakTime, setBreakTime] = useState(null);

    // D&D state for Captain
    const [localLineup, setLocalLineup] = useState([]);
    const [localBench, setLocalBench] = useState([]);

    useEffect(() => {
        if (startingCountdown !== null) {
            setCountdown(startingCountdown);
            const interval = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setCountdown(null);
        }
    }, [startingCountdown]);

    useEffect(() => {
        if (micOn) {
            audioQueueRef.current.resume();
        }
    }, [micOn]);

    useEffect(() => {
        const onVoice = (data) => {
            audioQueueRef.current.add(data);
        };
        const onTimer = (data) => {
            setBreakTime(data.breakRemainingTime);
        };
        socket.on('voiceData', onVoice);
        socket.on('encuentroTimer', onTimer);

        return () => {
            socket.off('voiceData', onVoice);
            socket.off('encuentroTimer', onTimer);
            audioQueueRef.current.clear();
            audioQueueRef.current.close();
        };
    }, [socket]);

    const joinTeam = (team) => {
        socket.emit('joinTeam', { roomId, team });
    };

    const voteCaptain = (votedId) => {
        socket.emit('vote_captain', { roomId, votedSocketId: votedId });
    };

    const submitLineup = () => {
        if (localLineup.length !== (settings.boardsPerMatch || 4) || localLineup.includes(null)) return;
        socket.emit('submit_lineup', { roomId, lineup: localLineup, bench: localBench });
    };

    const myId = socket.id;
    const myTeam = players.white.includes(myId) ? 'white' : players.black.includes(myId) ? 'black' : null;
    const isCaptain = encuentroState?.captains?.[myTeam] === myId;

    // Initialize Captain's Drag & Drop State
    useEffect(() => {
        if (isCaptain && (encuentroState.status === 'lineup' || encuentroState.status === 'break') && localLineup.length === 0 && localBench.length === 0) {
            const teamPlayers = players[myTeam];
            const currentLineup = encuentroState.lineups?.[myTeam] || [];

            if (encuentroState.status === 'break' && currentLineup.length > 0) {
                // Pre-fill with current lineup
                setLocalLineup([...currentLineup]);
                const remainingBench = teamPlayers.filter(id => !currentLineup.includes(id));
                setLocalBench(remainingBench);
            } else {
                const boardsCount = settings.boardsPerMatch || 4;
                setLocalLineup(Array(boardsCount).fill(null));
                setLocalBench([...teamPlayers]);
            }
        }
    }, [isCaptain, encuentroState?.status, players, myTeam, settings.boardsPerMatch, encuentroState?.lineups]);

    const handleDragStart = (e, playerId, source) => {
        e.dataTransfer.setData('playerId', playerId);
        e.dataTransfer.setData('source', source); // 'bench' or 'lineup_index'
    };

    const handleDrop = (e, targetSource) => {
        e.preventDefault();
        const playerId = e.dataTransfer.getData('playerId');
        const source = e.dataTransfer.getData('source');

        if (source === targetSource) return;

        let newLineup = [...localLineup];
        let newBench = [...localBench];

        // Remove from source
        if (source === 'bench') {
            newBench = newBench.filter(id => id !== playerId);
        } else if (source.startsWith('lineup_')) {
            const idx = parseInt(source.split('_')[1]);
            newLineup[idx] = null;
        }

        // Add to target
        if (targetSource === 'bench') {
            newBench.push(playerId);
        } else if (targetSource.startsWith('lineup_')) {
            const tgtIdx = parseInt(targetSource.split('_')[1]);
            const existingPlayer = newLineup[tgtIdx];
            if (existingPlayer) {
                // Swap back to source
                if (source === 'bench') {
                    newBench.push(existingPlayer);
                } else if (source.startsWith('lineup_')) {
                    const srcIdx = parseInt(source.split('_')[1]);
                    newLineup[srcIdx] = existingPlayer;
                }
            }
            newLineup[tgtIdx] = playerId;
        }

        setLocalLineup(newLineup);
        setLocalBench(newBench);
    };

    const allowDrop = (e) => e.preventDefault();

    const renderVotingPanel = (teamColor) => {
        const teamPlayers = players[teamColor];
        const captain = encuentroState?.captains?.[teamColor];
        const votes = encuentroState?.votes?.[teamColor] || {};

        const voteCounts = {};
        Object.values(votes).forEach(v => voteCounts[v] = (voteCounts[v] || 0) + 1);

        return (
            <div className="flex-1">
                <h3 className="text-sm uppercase tracking-widest text-slate-400 font-bold mb-4">{t.captain || 'Captain'}</h3>
                {captain ? (
                    <div className="bg-yellow-900/40 border border-yellow-500/50 rounded-xl p-4 flex items-center justify-center flex-col gap-2">
                        <Crown className="text-yellow-400" size={32} />
                        <span className="font-bold text-white text-lg">
                            {usernames[captain] || `Player ${captain.substr(0, 4)}`}
                        </span>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {teamPlayers.map(id => (
                            <button
                                key={id}
                                onClick={() => teamColor === myTeam ? voteCaptain(id) : null}
                                disabled={teamColor !== myTeam}
                                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${votes[myId] === id ? 'bg-emerald-900/40 border-emerald-500 text-emerald-300' : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-bold">{usernames[id] || `${t.player} ${id.substr(0, 4)}`}</span>
                                    {id === myId && <span className="text-xs text-slate-400">({t.you})</span>}
                                </div>
                                <div className="bg-slate-900 rounded-full px-3 py-1 text-sm font-mono">
                                    {voteCounts[id] || 0} {t.vote}s
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderCaptainLineupPanel = () => {
        if (!isCaptain) return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                <Clock className="animate-spin-slow text-slate-500 mb-4" size={48} />
                <h3 className="text-white text-xl font-bold mb-2">{t.waitingLineup || "Waiting for Captains..."}</h3>
                <p className="text-slate-400 text-center">
                    {t.delayInstructions || "The captains are deciding the lineup positions."}
                </p>
            </div>
        );

        const substitutionsLeft = encuentroState?.substitutionsLeft?.[myTeam];
        const isBreak = encuentroState?.status === 'break';

        // Calculate used subs currently in UI
        let subsUsed = 0;
        if (isBreak) {
            const oldLineup = encuentroState.lineups?.[myTeam] || [];
            for (let i = 0; i < localLineup.length; i++) {
                if (localLineup[i] !== oldLineup[i]) subsUsed++;
            }
        }

        const hasEnoughSubs = !isBreak || (substitutionsLeft !== undefined && subsUsed <= substitutionsLeft);

        return (
            <div className="flex-1 flex flex-col gap-6">
                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Crown className="text-emerald-400" size={24} />
                        <span className="text-emerald-300 font-bold">{t.youAreCaptain || "You are the Captain"}</span>
                    </div>

                    {isBreak && (
                        <div className="flex items-center gap-2 text-sm font-bold bg-slate-900 px-4 py-2 rounded-lg border border-slate-700">
                            <span className="text-slate-400">Cambios:</span>
                            <span className={hasEnoughSubs ? 'text-emerald-400' : 'text-red-400'}>
                                {subsUsed} / {substitutionsLeft}
                            </span>
                        </div>
                    )}

                    <button
                        onClick={submitLineup}
                        disabled={localLineup.includes(null) || !hasEnoughSubs || encuentroState?.readyForNextRound?.[myTeam]}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                        {encuentroState?.readyForNextRound?.[myTeam] ? t.waitingForOpponent || "Waiting..." : (t.submitLineup || "Submit Lineup")}
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    {/* Lineup Boards */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <h4 className="font-bold text-slate-300 uppercase tracking-widest text-sm mb-4">{t.lineup || "Lineup"} (Boards 1-{settings.boardsPerMatch})</h4>
                        <div className="space-y-3">
                            {localLineup.map((playerId, i) => (
                                <div
                                    key={i}
                                    onDrop={(e) => handleDrop(e, `lineup_${i}`)}
                                    onDragOver={allowDrop}
                                    className="flex items-center gap-4 bg-slate-900/80 p-3 rounded-lg border border-slate-700 flex-1 min-h-[60px]"
                                >
                                    <div className="w-8 flex-shrink-0 text-center font-black text-slate-500">
                                        #{i + 1}
                                    </div>
                                    <div className="flex-1">
                                        {playerId ? (
                                            <div
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, playerId, `lineup_${i}`)}
                                                className="bg-blue-600 cursor-grab active:cursor-grabbing text-white p-2 rounded text-sm font-bold shadow-md truncate"
                                            >
                                                {usernames[playerId] || `Player ${playerId.substr(0, 4)}`}
                                            </div>
                                        ) : (
                                            <div className="w-full h-9 border-2 border-dashed border-slate-600 rounded flex items-center justify-center text-slate-500 text-xs uppercase tracking-wider">
                                                Drop Player
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bench */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 flex flex-col">
                        <h4 className="font-bold text-slate-300 uppercase tracking-widest text-sm mb-4">{t.bench || "Bench"}</h4>
                        <div
                            className="flex-1 border-2 border-dashed border-slate-600 rounded-lg p-3 flex flex-col gap-2 min-h-[200px]"
                            onDrop={(e) => handleDrop(e, 'bench')}
                            onDragOver={allowDrop}
                        >
                            {localBench.length === 0 && (
                                <div className="flex-1 flex items-center justify-center text-slate-500 italic text-sm">
                                    Empty Bench
                                </div>
                            )}
                            {localBench.map((playerId) => (
                                <div
                                    key={playerId}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, playerId, 'bench')}
                                    className="bg-slate-700 cursor-grab active:cursor-grabbing text-white p-3 rounded border border-slate-600 font-bold shadow-sm"
                                >
                                    {usernames[playerId] || `Player ${playerId.substr(0, 4)}`}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-screen flex items-center justify-center bg-slate-950 text-white p-4">
            <div className="glass-panel w-full max-w-6xl p-8 flex flex-col gap-8 bg-slate-900/80 shadow-2xl rounded-3xl border border-slate-800">
                <header className="flex justify-between items-center border-b border-slate-800 pb-6">
                    <div>
                        <h1 className="text-4xl font-black bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent flex items-center gap-3">
                            <Crown size={36} className="text-amber-400" />
                            {roomName || roomId}
                        </h1>
                        <p className="text-slate-400 mt-2 font-medium tracking-wide">
                            {t.encuentroMode || "Match Mode"} • {settings.matches} {t.matches || "Rounds"} • {settings.boardsPerMatch} {t.boards || "Boards"}
                        </p>
                    </div>
                    <div className="flex gap-4 items-center">
                        <button onClick={onLeave} className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-red-900/40 text-slate-300 hover:text-red-400 transition-colors border border-slate-700 font-bold">
                            {t.leave}
                        </button>
                        <button onClick={() => setMicOn(!micOn)} className={`p-3 rounded-xl transition-colors ${micOn ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                            {micOn ? <Mic size={24} /> : <MicOff size={24} />}
                        </button>
                    </div>
                </header>

                {countdown !== null && (
                    <div className="w-full bg-blue-600/20 border border-blue-500 rounded-xl p-4 flex flex-col items-center justify-center animate-pulse">
                        <span className="text-blue-300 font-bold uppercase tracking-widest text-sm">{t.matchStartingIn}</span>
                        <div className="text-5xl font-black text-white">{countdown}</div>
                    </div>
                )}

                {/* Team Assignment Phase */}
                {!encuentroState?.status || encuentroState.status === 'lobby' || encuentroState.status === 'gathering' ? (
                    <div className="flex-1 grid grid-cols-2 gap-12">
                        {/* White Team */}
                        <div className="flex flex-col gap-4">
                            <h2 className="text-2xl font-black text-white flex justify-between items-end border-b border-slate-800 pb-2">
                                {t.teamWhite}
                                {!myTeam && (
                                    <button onClick={() => joinTeam('white')} disabled={players.white.length >= (settings.teamSize || 8)} className="text-sm bg-blue-600 py-1 px-4 rounded-lg font-bold hover:bg-blue-500 transition-colors">
                                        {t.join}
                                    </button>
                                )}
                            </h2>
                            <div className="space-y-3">
                                {players.white.map(id => (
                                    <div key={id} className="bg-slate-800/60 p-3 rounded-lg flex items-center justify-between border border-slate-700">
                                        <span className={id === myId ? "font-bold text-white" : "text-slate-300"}>
                                            {id === myId ? `${usernames[id]} (${t.you})` : usernames[id] || `Player ${id.substr(0, 4)}`}
                                        </span>
                                    </div>
                                ))}
                                {Array(Math.max(0, (settings.teamSize || 8) - players.white.length)).fill(0).map((_, i) => (
                                    <div key={i} className="border-2 border-dashed border-slate-800 p-3 rounded-lg text-slate-600 text-sm font-medium">
                                        {t.emptySlot}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Black Team */}
                        <div className="flex flex-col gap-4">
                            <h2 className="text-2xl font-black text-slate-300 flex justify-between items-end border-b border-slate-800 pb-2">
                                {t.teamBlack}
                                {!myTeam && (
                                    <button onClick={() => joinTeam('black')} disabled={players.black.length >= (settings.teamSize || 8)} className="text-sm bg-red-600 py-1 px-4 rounded-lg font-bold hover:bg-red-500 transition-colors">
                                        {t.join}
                                    </button>
                                )}
                            </h2>
                            <div className="space-y-3">
                                {players.black.map(id => (
                                    <div key={id} className="bg-slate-800/60 p-3 rounded-lg flex items-center justify-between border border-slate-700">
                                        <span className={id === myId ? "font-bold text-white" : "text-slate-300"}>
                                            {id === myId ? `${usernames[id]} (${t.you})` : usernames[id] || `Player ${id.substr(0, 4)}`}
                                        </span>
                                    </div>
                                ))}
                                {Array(Math.max(0, (settings.teamSize || 8) - players.black.length)).fill(0).map((_, i) => (
                                    <div key={i} className="border-2 border-dashed border-slate-800 p-3 rounded-lg text-slate-600 text-sm font-medium">
                                        {t.emptySlot}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Captain Voting or Lineup Phase */
                    <div className="flex flex-col flex-1 gap-8">
                        {/* Progress Stepper */}
                        <div className="flex items-center justify-center gap-4 text-sm font-bold uppercase tracking-wider border-b border-slate-800 pb-6">
                            <div className={`flex items-center gap-2 ${encuentroState.status === 'voting_captain' ? 'text-blue-400' : 'text-slate-500'}`}>
                                <Users size={18} /> {t.votingCaptain || "Voting Captain"}
                            </div>
                            <div className="w-16 h-px bg-slate-700"></div>
                            <div className={`flex items-center gap-2 ${encuentroState.status === 'lineup' ? 'text-amber-400' : 'text-slate-500'}`}>
                                <Crown size={18} /> {t.lineup || "Lineup"}
                            </div>
                            <div className="w-16 h-px bg-slate-700"></div>
                            <div className="flex items-center gap-2 text-slate-500">
                                <Play size={18} /> {t.play || "Play"}
                            </div>
                        </div>

                        {/* Phase Content */}
                        {encuentroState.status === 'voting_captain' && (
                            <div className="flex gap-12 flex-1">
                                {renderVotingPanel('white')}
                                <div className="w-px bg-slate-800"></div>
                                {renderVotingPanel('black')}
                            </div>
                        )}

                        {(encuentroState.status === 'lineup' || encuentroState.status === 'break') && (
                            <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto">
                                {encuentroState.status === 'break' && (
                                    <div className="mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700 text-center flex flex-col gap-2 relative">
                                        <h3 className="text-xl font-bold text-amber-500">{t.break || "Descanso"}</h3>
                                        <p className="text-slate-400 text-sm">Organiza los cambios para la ronda {encuentroState.currentRound + 1}</p>

                                        {breakTime !== null && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-900 border border-slate-600 px-4 py-2 rounded-lg font-mono text-xl font-bold text-slate-300">
                                                {Math.floor(breakTime / 60)}:{(breakTime % 60).toString().padStart(2, '0')}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {renderCaptainLineupPanel()}
                            </div>
                        )}
                    </div>
                )}

                {(!encuentroState?.status || encuentroState.status === 'lobby' || encuentroState.status === 'gathering') && isCreator && (
                    <div className="flex justify-center pt-8 border-t border-slate-800">
                        <button
                            onClick={() => socket.emit('startGame', { roomId })}
                            disabled={players.white.length === 0 || players.black.length === 0}
                            className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-black text-xl py-4 px-12 rounded-xl"
                        >
                            {t.startPhase || "Start Match"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
