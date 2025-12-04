import React, { useState, useEffect, useRef } from 'react';
import { ChessBoard } from './ChessBoard';
import { Heatmap } from './Visualizer/Heatmap';
import { Thermometer } from './Visualizer/Thermometer';
import { Shield } from './Visualizer/Shield';
import { Flame } from './Visualizer/Flame';
import { MessageSquare, Activity, Mic, MicOff, ChevronDown, ChevronUp, Flag, Send, Clock, Users } from 'lucide-react';
import { translations } from '../translations';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { AudioQueue } from '../utils/AudioQueue';

const getPieceIcon = (piece, color) => {
    const icons = {
        w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
        b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' }
    };
    return icons[color]?.[piece.toLowerCase()] || '';
};

export function GameRoom({ socket, roomId, roomName, role, gameState, teammateBoards, timer, boardResult, language = 'en', onLeave, myBoardId }) {
    // 1. All Hooks at the top
    const [showVisualizer, setShowVisualizer] = useState(true);
    const [micOn, setMicOn] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');

    // Filter out my own board from the visualizer
    console.log('GameRoom Render:', { role, myBoardId, boards: teammateBoards?.length });
    const filteredBoards = (teammateBoards || []).filter(b => b && b.boardId !== myBoardId);

    // Use the new hook for recording
    useVoiceRecorder(socket, roomId, micOn);

    // Audio Queue Ref to persist across renders
    const audioQueueRef = useRef(new AudioQueue());

    // Ensure AudioContext is resumed on user interaction
    useEffect(() => {
        if (micOn) {
            audioQueueRef.current.resume();
        }
    }, [micOn]);

    const t = translations[language];

    // Chat and Voice Listeners
    useEffect(() => {
        const onChat = (msg) => setMessages(prev => [...prev, msg]);
        const onVoice = (data) => {
            audioQueueRef.current.add(data);
        };

        socket.on('chatMessage', onChat);
        socket.on('voiceData', onVoice);

        return () => {
            socket.off('chatMessage', onChat);
            socket.off('voiceData', onVoice);
            audioQueueRef.current.clear();
            audioQueueRef.current.close();
        };
    }, [socket]);

    // Resume AudioContext on any interaction (Autoplay Policy)
    useEffect(() => {
        const resumeAudio = () => {
            if (audioQueueRef.current) {
                audioQueueRef.current.resume();
            }
        };
        window.addEventListener('click', resumeAudio);
        window.addEventListener('keydown', resumeAudio);
        return () => {
            window.removeEventListener('click', resumeAudio);
            window.removeEventListener('keydown', resumeAudio);
        };
    }, []);

    // 2. Helper Functions & Derived State
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const isPlayer = role === 'white' || role === 'black';

    const opponentCaptures = role === 'white' ? gameState?.captures?.b : gameState?.captures?.w;
    const yourCaptures = role === 'white' ? gameState?.captures?.w : gameState?.captures?.b;

    const opponentCaptureColor = role === 'white' ? 'w' : 'b';
    const yourCaptureColor = role === 'white' ? 'b' : 'w';

    const handleResign = () => {
        if (window.confirm(t.resignConfirm)) {
            socket.emit('resign', { roomId });
        }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;
        socket.emit('sendChat', { roomId, message: inputText });
        setInputText('');
    };

    // 3. Early Return (Loading State)
    if (!gameState && isPlayer) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
                <div className="text-2xl font-bold animate-pulse">{t.initializing}</div>
            </div>
        );
    }

    // 4. Main Render
    return (
        <div className="h-screen flex flex-col bg-slate-900 text-white overflow-hidden">
            {/* Header */}
            <header className="bg-slate-800/50 p-2 flex justify-between items-center shrink-0 border-b border-slate-700">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onLeave}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 transition-colors border border-slate-700 hover:border-red-500/50 text-xs font-bold uppercase"
                    >
                        {t.leave || "Leave"}
                    </button>
                    <h2 className="text-lg font-bold text-slate-300">{t.room}: {roomName || roomId}</h2>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${role === 'white' ? 'bg-blue-600' : role === 'black' ? 'bg-red-600' : 'bg-slate-600'}`}>
                        {role === 'white' ? t.white : role === 'black' ? t.black : 'Spectator'}
                    </span>
                </div>

                {/* Timer */}
                <div className="flex gap-8 bg-slate-900 px-6 py-1 rounded-full border border-slate-700">
                    <div className={`text-xl font-mono font-bold ${timer.white < 60 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
                        {formatTime(timer.white)}
                    </div>
                    <div className="text-slate-600">|</div>
                    <div className={`text-xl font-mono font-bold ${timer.black < 60 ? 'text-red-500 animate-pulse' : 'text-red-400'}`}>
                        {formatTime(timer.black)}
                    </div>
                </div>

                <div className="flex gap-2">
                    {!boardResult && (
                        <button
                            onClick={handleResign}
                            className="p-2 rounded-full bg-slate-700 hover:bg-red-600 transition-colors text-slate-300 hover:text-white"
                            title={t.resign}
                        >
                            <Flag size={16} />
                        </button>
                    )}
                    <button
                        onClick={() => setMicOn(!micOn)}
                        className={`p-2 rounded-full transition-colors ${micOn ? 'bg-green-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                        title={t.voiceChat}
                    >
                        {micOn ? <Mic size={16} /> : <MicOff size={16} />}
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">

                {/* Center: Board & Visualizer */}
                <div className="flex-1 flex flex-col min-w-0">

                    {/* Top: The Game Board or Waiting Screen */}
                    <div className="flex-1 flex items-center justify-center p-4 min-h-0 relative z-10 overflow-hidden max-h-[50vh]">
                        <div key={showVisualizer ? 'v-open' : 'v-closed'} className="h-full max-w-full aspect-square relative shadow-2xl">
                            {boardResult ? (
                                <div className="absolute inset-0 bg-slate-900/90 z-20 flex flex-col items-center justify-center text-center p-8 rounded border border-slate-700">
                                    <h2 className="text-3xl font-bold mb-4">{t.gameOver}</h2>
                                    <div className="text-xl mb-2">
                                        {t.winner}: <span className={boardResult.winner === 'white' ? 'text-blue-400' : 'text-red-400'}>{boardResult.winner === 'white' ? t.white : t.black}</span>
                                    </div>
                                    <div className="text-slate-400 mb-8">
                                        {t.reason}: {boardResult.reason}
                                    </div>
                                    <div className="text-sm text-slate-500 animate-pulse">
                                        {t.waitingForOthers}
                                    </div>
                                    <div className="mt-8 p-4 bg-slate-800 rounded text-left w-full max-w-sm">
                                        <div className="text-xs text-slate-400 uppercase font-bold mb-2">{t.teamStatus}</div>
                                        <div className="flex justify-between items-center">
                                            <span>{t.yourContribution}:</span>
                                            <span className={`font-mono ${boardResult.winner === role ? 'text-green-400' : 'text-slate-500'}`}>
                                                +{boardResult.winner === role ? boardResult.points : 0} pts
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <ChessBoard socket={socket} roomId={roomId} role={role} fen={gameState?.fen} />
                            )}
                        </div>
                    </div>

                    {/* Bottom: Visualizer (Collapsible) */}
                    <div className={`transition-all duration-300 ease-in-out border-t border-slate-700 bg-slate-900/95 flex flex-col ${showVisualizer ? 'h-[45vh]' : 'h-8'}`}>
                        <div
                            className="h-8 bg-slate-800/50 flex items-center justify-between px-4 cursor-pointer hover:bg-slate-800"
                            onClick={() => setShowVisualizer(!showVisualizer)}
                        >
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Activity size={14} /> {t.teamVisualizer}
                            </span>
                            {showVisualizer ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </div>

                        {showVisualizer && (
                            <div className="flex-1 p-2 flex gap-24 overflow-x-auto items-center justify-start flex-nowrap w-full">
                                {filteredBoards.length === 0 ? (
                                    <div className="h-full aspect-square bg-slate-800/50 rounded border border-slate-700/50 flex items-center justify-center text-slate-600 text-xs">
                                        {t.waitingForTeammates}
                                    </div>
                                ) : (
                                    filteredBoards.map((board) => {
                                        const topCaptures = role === 'white' ? board.captures?.b : board.captures?.w;
                                        const bottomCaptures = role === 'white' ? board.captures?.w : board.captures?.b;

                                        const topKingStatus = role === 'white' ? board.kingStatus?.b : board.kingStatus?.w;
                                        const bottomKingStatus = role === 'white' ? board.kingStatus?.w : board.kingStatus?.b;

                                        const topBurn = role === 'white' ? board.burnLevel?.b : board.burnLevel?.w;
                                        const bottomBurn = role === 'white' ? board.burnLevel?.w : board.burnLevel?.b;

                                        const topName = role === 'white' ? board.players?.black : board.players?.white;
                                        const bottomName = role === 'white' ? board.players?.white : board.players?.black;

                                        const topColor = role === 'white' ? 'text-red-400' : 'text-blue-400';
                                        const bottomColor = role === 'white' ? 'text-blue-400' : 'text-red-400';

                                        return (
                                            <div key={board.id} className="h-full flex flex-col gap-1 shrink-0 min-w-[300px]">
                                                {/* Top Name */}
                                                <div className={`text-center text-xs font-bold ${topColor} mx-4`}>
                                                    {topName}
                                                </div>

                                                <div className="flex-1 flex gap-2 min-h-0">
                                                    {/* Main Visualizer Container */}
                                                    <div className="h-full flex flex-col bg-slate-800 rounded border border-slate-700 relative shadow-xl p-2 flex-1">

                                                        {/* Top: Opponent Info (Captures + Shield + Flame) */}
                                                        <div className="h-8 flex items-center justify-between gap-2 mb-1">
                                                            <div className="flex-1 h-full flex items-center justify-center gap-1 bg-slate-900/50 rounded overflow-hidden px-1">
                                                                {topCaptures?.length > 0 ? topCaptures.map((p, i) => (
                                                                    <span key={i} className={`text-lg ${role === 'white' ? 'text-white' : 'text-slate-400'}`}>
                                                                        {getPieceIcon(p, role === 'white' ? 'w' : 'b')}
                                                                    </span>
                                                                )) : <span className="text-xs text-slate-600">-</span>}
                                                            </div>
                                                            <div className="flex gap-1 h-full">
                                                                {topKingStatus && (
                                                                    <div className="h-full aspect-square flex items-center justify-center bg-slate-900/50 rounded border border-slate-700/50">
                                                                        <Shield status={topKingStatus.status} isCastled={topKingStatus.isCastled} />
                                                                    </div>
                                                                )}
                                                                {topBurn !== undefined && (
                                                                    <div className="h-full aspect-square flex items-center justify-center bg-slate-900/50 rounded border border-slate-700/50">
                                                                        <Flame level={topBurn} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Heatmap */}
                                                        <div className="flex-1 flex items-center justify-center min-h-0 relative">
                                                            <div style={{ aspectRatio: '1/1', height: '100%', maxHeight: '100%', width: 'auto' }}>
                                                                <Heatmap data={board.heatmap} orientation={role} />
                                                            </div>
                                                        </div>

                                                        {/* Bottom: Teammate Info (Captures + Shield + Flame) */}
                                                        <div className="h-8 flex items-center justify-between gap-2 mt-1">
                                                            <div className="flex-1 h-full flex items-center justify-center gap-1 bg-slate-900/50 rounded overflow-hidden px-1">
                                                                {bottomCaptures?.length > 0 ? bottomCaptures.map((p, i) => (
                                                                    <span key={i} className={`text-lg ${role === 'white' ? 'text-slate-400' : 'text-white'}`}>
                                                                        {getPieceIcon(p, role === 'white' ? 'b' : 'w')}
                                                                    </span>
                                                                )) : <span className="text-xs text-slate-600">-</span>}
                                                            </div>
                                                            <div className="flex gap-1 h-full">
                                                                {bottomKingStatus && (
                                                                    <div className="h-full aspect-square flex items-center justify-center bg-slate-900/50 rounded border border-slate-700/50">
                                                                        <Shield status={bottomKingStatus.status} isCastled={bottomKingStatus.isCastled} />
                                                                    </div>
                                                                )}
                                                                {bottomBurn !== undefined && (
                                                                    <div className="h-full aspect-square flex items-center justify-center bg-slate-900/50 rounded border border-slate-700/50">
                                                                        <Flame level={bottomBurn} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Thermometer */}
                                                    <div className="w-6 h-full bg-slate-800 rounded-full relative border border-slate-700 overflow-hidden shrink-0">
                                                        <Thermometer score={board.analysis?.score || 0} orientation={role} />
                                                    </div>
                                                </div>

                                                {/* Bottom Name */}
                                                <div className={`text-center text-xs font-bold ${bottomColor} mx-4`}>
                                                    {bottomName}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div >
                        )
                        }
                    </div >
                </div >

                {/* Right: Chat & Metrics */}
                < div className="w-80 border-l border-slate-800 flex flex-col bg-slate-900/50" >
                    {/* Metrics Panel */}
                    < div className="p-4 border-b border-slate-800 space-y-4" >
                        <div>
                            <div className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">{t.opponentCaptures}</div>
                            <div className="flex flex-wrap gap-1 min-h-[2rem]">
                                {opponentCaptures?.map((p, i) => (
                                    <span key={i} className={`text-2xl leading-none ${opponentCaptureColor === 'w' ? 'text-white' : 'text-slate-400'}`}>
                                        {getPieceIcon(p, opponentCaptureColor)}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">{t.yourCaptures}</div>
                            <div className="flex flex-wrap gap-1 min-h-[2rem]">
                                {yourCaptures?.map((p, i) => (
                                    <span key={i} className={`text-2xl leading-none ${yourCaptureColor === 'w' ? 'text-white' : 'text-slate-400'}`}>
                                        {getPieceIcon(p, yourCaptureColor)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div >

                    {/* Chat */}
                    < div className="flex-1 flex flex-col min-h-0" >
                        <div className="p-3 border-b border-slate-800 font-bold text-slate-400 flex items-center gap-2">
                            <MessageSquare size={16} /> {t.teamChat}
                        </div>
                        <div className="flex-1 p-2 overflow-y-auto text-sm space-y-2">
                            {messages.map((msg, i) => (
                                <div key={i} className={`p-2 rounded ${msg.sender === role ? 'bg-blue-900/30 ml-8' : 'bg-slate-800 mr-8'}`}>
                                    <div className="text-xs text-slate-500 mb-1">{msg.sender}</div>
                                    <div className="text-slate-200">{msg.text}</div>
                                </div>
                            ))}
                            <div className="text-slate-500 italic text-center mt-4 text-xs">
                                {t.voiceChatStatus} {micOn ? <span className="text-green-400">{t.active}</span> : t.muted}
                            </div>
                        </div>
                        <form onSubmit={sendMessage} className="p-2 border-t border-slate-800">
                            <input
                                type="text"
                                placeholder={t.typePlaceholder}
                                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm outline-none focus:border-blue-500 text-white"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                            />
                        </form>
                    </div >
                </div >

            </div >
        </div >
    );
}
