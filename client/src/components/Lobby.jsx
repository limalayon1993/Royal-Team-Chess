import React, { useState, useEffect, useRef } from 'react';
import { Users, Clock, Play, Mic, MicOff, Eye } from 'lucide-react';
import { translations } from '../translations';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { AudioQueue } from '../utils/AudioQueue';

export function Lobby({ socket, roomId, roomName, settings, players, ready, isCreator, language = 'en', onLeave, usernames = {}, elos = {}, startingCountdown = null }) {
    console.log('Lobby rendered with settings:', settings);
    const [micOn, setMicOn] = useState(false);

    // Use the new hook for recording
    useVoiceRecorder(socket, roomId, micOn);

    const audioQueueRef = useRef(new AudioQueue());
    const t = translations[language];

    // Local Countdown State
    const [countdown, setCountdown] = useState(null);

    useEffect(() => {
        if (startingCountdown !== null) {
            setCountdown(startingCountdown);
            const interval = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0; // Game starts
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setCountdown(null);
        }
    }, [startingCountdown]);

    // Derived state from settings
    const currentTeamSize = settings?.teamSize || 2;
    const currentTime = settings?.time || 600;

    // Ensure AudioContext is resumed on user interaction
    useEffect(() => {
        if (micOn) {
            audioQueueRef.current.resume();
        }
    }, [micOn]);

    // Voice Data Listener (Playback)
    useEffect(() => {
        const onVoice = (data) => {
            // Only play if we are NOT the one speaking (simple echo cancellation)
            audioQueueRef.current.add(data);
        };
        socket.on('voiceData', onVoice);
        return () => {
            socket.off('voiceData', onVoice);
            audioQueueRef.current.clear();
            audioQueueRef.current.close();
        };
    }, [socket]);

    const joinTeam = (team) => {
        socket.emit('joinTeam', { roomId, team });
    };

    const toggleReady = () => {
        const myId = socket.id;
        const inWhite = players.white.includes(myId);
        const inBlack = players.black.includes(myId);

        if (!inWhite && !inBlack) return;

        const isReady = inWhite ? ready.white.includes(myId) : ready.black.includes(myId);
        socket.emit('playerReady', { roomId, isReady: !isReady });
    };

    const myId = socket.id;
    const inWhite = players.white.includes(myId);
    const inBlack = players.black.includes(myId);
    const isReady = inWhite ? ready.white.includes(myId) : (inBlack ? ready.black.includes(myId) : false);

    // Determine if game can start
    const allWhiteReady = players.white.length === currentTeamSize && players.white.every(id => ready.white.includes(id));
    const allBlackReady = players.black.length === currentTeamSize && players.black.every(id => ready.black.includes(id));
    const canStart = isCreator && allWhiteReady && allBlackReady;

    return (
        <div className="h-screen flex items-center justify-center bg-slate-900 text-white p-4">
            <div className="glass-panel w-full max-w-4xl p-8 flex flex-col gap-8">
                <header className="flex justify-between items-center border-b border-slate-700 pb-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-2">
                            {roomName || roomId}
                            {settings?.isMatchmaking && <span className="text-sm bg-blue-600 px-2 py-1 rounded text-white font-bold tracking-wider">RANKED</span>}
                        </h1>
                        <p className="text-slate-400">{t.configure}</p>
                    </div>
                    <div className="flex gap-4 items-center">
                        <button
                            onClick={onLeave}
                            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-red-900/50 text-slate-300 hover:text-red-400 transition-colors border border-slate-700 hover:border-red-500/50"
                        >
                            {t.leave || "Leave"}
                        </button>
                        {/* Voice Chat Toggle */}
                        <button
                            onClick={() => setMicOn(!micOn)}
                            className={`p-2 rounded-full ${micOn ? 'bg-green-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                            title="Toggle Voice Chat"
                        >
                            {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                        </button>
                    </div>
                </header>

                {/* Settings Section */}
                <div className="flex gap-8 bg-slate-800/30 p-4 rounded-lg justify-center">
                    <div className="flex flex-col gap-2 items-center">
                        <label className="text-sm text-slate-400 font-bold flex items-center gap-2 uppercase tracking-wider">
                            <Clock size={16} /> {t.timePerTeam}
                        </label>
                        <div className="text-2xl font-bold text-white font-mono">
                            {Math.floor(currentTime / 60)}m
                        </div>
                    </div>
                    <div className="w-px bg-slate-700 mx-4"></div>
                    <div className="flex flex-col gap-2 items-center">
                        <label className="text-sm text-slate-400 font-bold flex items-center gap-2 uppercase tracking-wider">
                            <Users size={16} /> {t.playersPerTeam}
                        </label>
                        <div className="text-2xl font-bold text-white font-mono">
                            {currentTeamSize} vs {currentTeamSize}
                        </div>
                    </div>
                </div>

                {/* Match Starting Countdown Banner */}
                {countdown !== null && (
                    <div className="w-full bg-blue-600/20 border border-blue-500 rounded-xl p-4 flex flex-col items-center justify-center animate-pulse">
                        <span className="text-blue-300 font-bold uppercase tracking-widest text-sm">MATCH STARTING IN</span>
                        <div className="text-5xl font-black text-white">{countdown}</div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-8 flex-1">
                    {/* White Team */}
                    <div className="glass-panel p-4 bg-blue-900/10 border-blue-500/30 flex flex-col">
                        <h2 className="text-xl font-bold text-white mb-4 flex justify-between">
                            {t.teamWhite}
                            {inWhite ? (
                                !settings?.isMatchmaking && (
                                    <button
                                        onClick={() => socket.emit('leaveTeam', { roomId })}
                                        className="text-xs bg-red-600 px-2 py-1 rounded hover:bg-red-500 text-white"
                                    >
                                        {t.leave || "Leave"}
                                    </button>
                                )
                            ) : (
                                !settings?.isMatchmaking && (
                                    <button
                                        onClick={() => joinTeam('white')}
                                        disabled={inBlack || players.white.length >= currentTeamSize}
                                        className="text-xs bg-blue-600 px-2 py-1 rounded hover:bg-blue-500 disabled:opacity-50 text-white"
                                    >
                                        {t.join}
                                    </button>
                                )
                            )}
                        </h2>
                        <div className="space-y-2 flex-1">
                            {players.white.map(id => (
                                <div key={id} className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
                                    <span className={id === myId ? "font-bold text-white" : "text-slate-400"}>
                                        {id === myId ? (usernames[id] ? `${usernames[id]} (${t.you})` : t.you) : (usernames[id] || `${t.player} ${id.substr(0, 4)}`)}
                                        {elos[id] && <span className="ml-2 text-yellow-500 font-mono text-xs">({elos[id]})</span>}
                                    </span>
                                    {ready.white.includes(id) && <span className="text-green-400 text-xs">{t.ready}</span>}
                                </div>
                            ))}
                            {Array(Math.max(0, currentTeamSize - players.white.length)).fill(0).map((_, i) => (
                                <div key={i} className="border-2 border-dashed border-slate-700 p-2 rounded text-slate-600 text-center text-sm">
                                    {t.emptySlot}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Black Team */}
                    <div className="glass-panel p-4 bg-red-900/10 border-red-500/30 flex flex-col">
                        <h2 className="text-xl font-bold text-slate-400 mb-4 flex justify-between">
                            {t.teamBlack}
                            {inBlack ? (
                                !settings?.isMatchmaking && (
                                    <button
                                        onClick={() => socket.emit('leaveTeam', { roomId })}
                                        className="text-xs bg-red-600 px-2 py-1 rounded hover:bg-red-500 text-white"
                                    >
                                        {t.leave || "Leave"}
                                    </button>
                                )
                            ) : (
                                !settings?.isMatchmaking && (
                                    <button
                                        onClick={() => joinTeam('black')}
                                        disabled={inWhite || players.black.length >= currentTeamSize}
                                        className="text-xs bg-red-600 px-2 py-1 rounded hover:bg-red-500 disabled:opacity-50"
                                    >
                                        {t.join}
                                    </button>
                                )
                            )}
                        </h2>
                        <div className="space-y-2 flex-1">
                            {players.black.map(id => (
                                <div key={id} className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
                                    <span className={id === myId ? "font-bold text-white" : "text-slate-400"}>
                                        {id === myId ? (usernames[id] ? `${usernames[id]} (${t.you})` : t.you) : (usernames[id] || `${t.player} ${id.substr(0, 4)}`)}
                                        {elos[id] && <span className="ml-2 text-yellow-500 font-mono text-xs">({elos[id]})</span>}
                                    </span>
                                    {ready.black.includes(id) && <span className="text-green-400 text-xs">{t.ready}</span>}
                                </div>
                            ))}
                            {Array(Math.max(0, currentTeamSize - players.black.length)).fill(0).map((_, i) => (
                                <div key={i} className="border-2 border-dashed border-slate-700 p-2 rounded text-slate-600 text-center text-sm">
                                    {t.emptySlot}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Spectators Section */}
                <div className="glass-panel p-4 bg-slate-800/30 border-slate-700/50 flex flex-col">
                    <h2 className="text-lg font-bold text-slate-400 mb-2 flex justify-between items-center">
                        <span className="flex items-center gap-2"><Eye size={18} /> {t.spectators || "Spectators"}</span>
                        {players.spectators.includes(myId) ? (
                            !settings?.isMatchmaking && (
                                <button
                                    onClick={() => socket.emit('leaveTeam', { roomId })}
                                    className="text-xs bg-slate-600 px-2 py-1 rounded hover:bg-slate-500 text-white"
                                >
                                    {t.leave || "Leave"}
                                </button>
                            )
                        ) : (
                            !settings?.isMatchmaking && (
                                <button
                                    onClick={() => joinTeam('spectator')}
                                    disabled={inWhite || inBlack}
                                    className="text-xs bg-slate-700 px-2 py-1 rounded hover:bg-slate-600 text-white disabled:opacity-50"
                                >
                                    {t.joinSpectator || "Join as Spectator"}
                                </button>
                            )
                        )}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {players.spectators.length > 0 ? players.spectators.map(id => (
                            <span key={id} className="bg-slate-900/50 px-2 py-1 rounded text-sm text-slate-400 border border-slate-700/50">
                                {id === myId ? (usernames[id] ? `${usernames[id]} (${t.you})` : t.you) : (usernames[id] || `${t.player} ${id.substr(0, 4)}`)}
                            </span>
                        )) : (
                            <span className="text-slate-600 text-sm italic">{t.noSpectators || "No spectators yet"}</span>
                        )}
                    </div>
                </div>

                <footer className="flex justify-center gap-4 pt-4 border-t border-slate-700">
                    <button
                        onClick={toggleReady}
                        disabled={!inWhite && !inBlack}
                        className={`btn-primary px-8 py-3 text-xl flex items-center gap-2 ${isReady ? 'bg-green-600 hover:bg-green-500' : ''}`}
                    >
                        {isReady ? t.readyExclamation : t.markReady}
                    </button>

                    <button
                        onClick={() => socket.emit('startGame', { roomId })}
                        disabled={!canStart}
                        className={`btn-primary px-8 py-3 text-xl flex items-center gap-2 ${!canStart ? 'opacity-50 cursor-not-allowed bg-slate-600' : 'bg-yellow-600 hover:bg-yellow-500'}`}
                        title={!isCreator ? t.hostOnly : t.allReady}
                    >
                        <Play size={24} /> {isCreator ? t.startGame : t.waitingForHost}
                    </button>
                </footer>
            </div>
        </div>
    );
}
