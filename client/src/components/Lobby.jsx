import React, { useState, useEffect } from 'react';
import { Users, Clock, Play, Mic, MicOff } from 'lucide-react';
import { translations } from '../translations';

import { AudioQueue } from '../utils/AudioQueue';

export function Lobby({ socket, roomId, settings, players, ready, isCreator, language = 'en' }) {
    const [teamSize, setTeamSize] = useState(settings?.teamSize || 2);
    const [time, setTime] = useState(settings?.time || 600);
    const [micOn, setMicOn] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null); // Add mediaRecorder state

    const audioQueueRef = React.useRef(new AudioQueue());
    const t = translations[language];

    // Voice Data Listener (Playback)
    useEffect(() => {
        const onVoice = (data) => {
            if (!micOn) { // Only play if not speaking (to avoid echo) - or allow it? Usually avoid self-echo.
                audioQueueRef.current.add(data);
            }
        };
        socket.on('voiceData', onVoice);
        return () => {
            socket.off('voiceData', onVoice);
            audioQueueRef.current.clear();
        };
    }, [micOn, socket]);

    // Mic Capture Logic (Same as GameRoom)
    useEffect(() => {
        if (micOn) {
            // ... (We need to start recording here, logic was missing in previous Lobby code!)
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    const recorder = new MediaRecorder(stream);
                    recorder.ondataavailable = (e) => {
                        if (e.data.size > 0) {
                            const reader = new FileReader();
                            reader.readAsDataURL(e.data);
                            reader.onloadend = () => {
                                socket.emit('voiceData', { roomId, data: reader.result });
                            };
                        }
                    };
                    recorder.start(100);
                    setMediaRecorder(recorder);
                })
                .catch(err => {
                    console.error('Mic access denied:', err);
                    setMicOn(false);
                });
        } else {
            if (mediaRecorder) {
                mediaRecorder.stop();
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
                setMediaRecorder(null);
            }
        }
    }, [micOn, roomId, socket]);

    useEffect(() => {
        if (settings) {
            setTeamSize(settings.teamSize || 2);
            setTime(settings.time || 600);
        }
    }, [settings]);

    const updateSettings = () => {
        socket.emit('updateSettings', { roomId, settings: { time: parseInt(time), teamSize: parseInt(teamSize) } });
    };

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

    return (
        <div className="h-screen flex items-center justify-center bg-slate-900 text-white p-4">
            <div className="glass-panel w-full max-w-4xl p-8 flex flex-col gap-8">
                <header className="flex justify-between items-center border-b border-slate-700 pb-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                            {t.lobby}: {roomId}
                        </h1>
                        <p className="text-slate-400">{t.configure}</p>
                    </div>
                    <div className="flex gap-4 items-center">
                        {/* Voice Chat Toggle */}
                        {/* Voice Chat Toggle */}
                        <button
                            onClick={() => {
                                if (!micOn) {
                                    navigator.mediaDevices.getUserMedia({ audio: true })
                                        .then(() => setMicOn(true))
                                        .catch(err => {
                                            console.error('Mic access denied:', err);
                                            alert(t.micError || 'Microphone access denied');
                                            setMicOn(false);
                                        });
                                } else {
                                    setMicOn(false);
                                }
                            }}
                            className={`p-2 rounded-full ${micOn ? 'bg-green-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                            title="Toggle Voice Chat"
                        >
                            {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                        </button>
                    </div>
                </header>

                {/* Settings Section */}
                <div className="flex gap-8 bg-slate-800/30 p-4 rounded-lg">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-slate-400 font-bold flex items-center gap-2">
                            <Clock size={16} /> {t.timePerTeam}
                        </label>
                        <input
                            type="number"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            onBlur={updateSettings}
                            className="input-field w-32"
                            disabled={false} // Allow anyone to change for MVP, or check isCreator
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-slate-400 font-bold flex items-center gap-2">
                            <Users size={16} /> {t.playersPerTeam}
                        </label>
                        <input
                            type="number"
                            value={teamSize}
                            onChange={(e) => setTeamSize(e.target.value)}
                            onBlur={updateSettings}
                            className="input-field w-32"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 flex-1">
                    {/* White Team */}
                    <div className="glass-panel p-4 bg-blue-900/10 border-blue-500/30 flex flex-col">
                        <h2 className="text-xl font-bold text-blue-400 mb-4 flex justify-between">
                            {t.teamWhite}
                            <button
                                onClick={() => joinTeam('white')}
                                disabled={inWhite || players.white.length >= teamSize}
                                className="text-xs bg-blue-600 px-2 py-1 rounded hover:bg-blue-500 disabled:opacity-50"
                            >
                                {t.join}
                            </button>
                        </h2>
                        <div className="space-y-2 flex-1">
                            {players.white.map(id => (
                                <div key={id} className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
                                    <span className={id === myId ? "font-bold text-white" : "text-slate-400"}>
                                        {id === myId ? t.you : `${t.player} ${id.substr(0, 4)}`}
                                    </span>
                                    {ready.white.includes(id) && <span className="text-green-400 text-xs">{t.ready}</span>}
                                </div>
                            ))}
                            {Array(Math.max(0, teamSize - players.white.length)).fill(0).map((_, i) => (
                                <div key={i} className="border-2 border-dashed border-slate-700 p-2 rounded text-slate-600 text-center text-sm">
                                    {t.emptySlot}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Black Team */}
                    <div className="glass-panel p-4 bg-red-900/10 border-red-500/30 flex flex-col">
                        <h2 className="text-xl font-bold text-red-400 mb-4 flex justify-between">
                            {t.teamBlack}
                            <button
                                onClick={() => joinTeam('black')}
                                disabled={inBlack || players.black.length >= teamSize}
                                className="text-xs bg-red-600 px-2 py-1 rounded hover:bg-red-500 disabled:opacity-50"
                            >
                                {t.join}
                            </button>
                        </h2>
                        <div className="space-y-2 flex-1">
                            {players.black.map(id => (
                                <div key={id} className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
                                    <span className={id === myId ? "font-bold text-white" : "text-slate-400"}>
                                        {id === myId ? t.you : `${t.player} ${id.substr(0, 4)}`}
                                    </span>
                                    {ready.black.includes(id) && <span className="text-green-400 text-xs">{t.ready}</span>}
                                </div>
                            ))}
                            {Array(Math.max(0, teamSize - players.black.length)).fill(0).map((_, i) => (
                                <div key={i} className="border-2 border-dashed border-slate-700 p-2 rounded text-slate-600 text-center text-sm">
                                    {t.emptySlot}
                                </div>
                            ))}
                        </div>
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
                        disabled={!isCreator || players.white.length === 0 || players.black.length === 0 || players.white.some(p => !ready.white.includes(p)) || players.black.some(p => !ready.black.includes(p))}
                        className={`btn-primary px-8 py-3 text-xl flex items-center gap-2 ${(!isCreator || players.white.length === 0 || players.black.length === 0 || players.white.some(p => !ready.white.includes(p)) || players.black.some(p => !ready.black.includes(p))) ? 'opacity-50 cursor-not-allowed bg-slate-600' : 'bg-yellow-600 hover:bg-yellow-500'}`}
                        title={!isCreator ? t.hostOnly : t.allReady}
                    >
                        <Play size={24} /> {isCreator ? t.startGame : t.waitingForHost}
                    </button>
                </footer>
            </div>
        </div>
    );
}
