import React, { useState, useEffect, useRef } from 'react';
import { ChessBoard } from './ChessBoard';
import { Heatmap } from './Visualizer/Heatmap';
import { Thermometer } from './Visualizer/Thermometer';
import { Shield } from './Visualizer/Shield';
import { Flame } from './Visualizer/Flame';
import { MessageSquare, Activity, Mic, MicOff, ChevronDown, ChevronUp, Flag, Send, Clock, Users, Handshake, LogOut, X, Check } from 'lucide-react';
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

export function GameRoom({ socket, roomId, roomName, role, pieceColor, gameState, teammateBoards, spectatorData, timer, boardResult, language = 'en', onLeave, myBoardId, settings, encuentroState }) {
    // 1. All Hooks at the top
    const [showVisualizer, setShowVisualizer] = useState(true);
    const [micOn, setMicOn] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [drawOfferedByMe, setDrawOfferedByMe] = useState(false);
    const [drawOfferReceived, setDrawOfferReceived] = useState(false);
    const [teammateViewModes, setTeammateViewModes] = useState({}); // boardId -> 'board' | 'heatmap'

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
        const onDrawOffered = () => setDrawOfferReceived(true);
        const onDrawRejected = () => {
            setDrawOfferedByMe(false);
            alert(t.drawRejected || "Draw offer rejected");
        };

        socket.on('chatMessage', onChat);
        socket.on('voiceData', onVoice);
        socket.on('drawOffered', onDrawOffered);
        socket.on('drawRejected', onDrawRejected);

        return () => {
            socket.off('chatMessage', onChat);
            socket.off('voiceData', onVoice);
            socket.off('drawOffered', onDrawOffered);
            socket.off('drawRejected', onDrawRejected);
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

    const effectivePieceColor = pieceColor || role;
    const opponentCaptures = effectivePieceColor === 'white' ? gameState?.captures?.b : gameState?.captures?.w;
    const yourCaptures = effectivePieceColor === 'white' ? gameState?.captures?.w : gameState?.captures?.b;

    const opponentCaptureColor = effectivePieceColor === 'white' ? 'w' : 'b';
    const yourCaptureColor = effectivePieceColor === 'white' ? 'b' : 'w';

    const handleResign = () => {
        if (window.confirm(t.resignConfirm)) {
            socket.emit('resign', { roomId });
        }
    };

    const handleOfferDraw = () => {
        if (drawOfferedByMe) return;
        if (window.confirm(t.drawConfirm)) {
            setDrawOfferedByMe(true);
            socket.emit('offerDraw', { roomId });
        }
    };

    const handleAcceptDraw = () => {
        socket.emit('acceptDraw', { roomId });
        setDrawOfferReceived(false);
    };

    const handleRejectDraw = () => {
        socket.emit('rejectDraw', { roomId });
        setDrawOfferReceived(false);
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;
        socket.emit('sendChat', { roomId, message: inputText });
        setInputText('');
    };

    // 3. Derived State
    const isBench = isPlayer && myBoardId === null && settings?.mode === 'encuentro';

    // Early Return (Loading State)
    if (!gameState && isPlayer && !isBench) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
                <div className="text-2xl font-bold animate-pulse">{t.initializingMatch}</div>
            </div>
        );
    }

    // 4. Main Render
    return (
        <div className="h-screen flex flex-col bg-slate-900 text-white overflow-hidden relative">
            {/* Draw Offer Modal */}
            {drawOfferReceived && !boardResult && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-800 border border-slate-600 p-4 rounded-xl shadow-2xl flex flex-col items-center gap-4 animate-bounce-in">
                    <div className="text-lg font-bold flex items-center gap-2">
                        <Flag className="text-blue-400" /> {t.drawOffered}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleAcceptDraw} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-bold flex items-center gap-2">
                            <Check size={16} /> {t.accept}
                        </button>
                        <button onClick={handleRejectDraw} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-bold flex items-center gap-2">
                            <X size={16} /> {t.reject}
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="bg-slate-800/50 p-2 flex justify-between items-center shrink-0 border-b border-slate-700">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onLeave}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 transition-colors border border-slate-700 hover:border-red-500/50 text-xs font-bold uppercase"
                    >
                        {t.leave}
                    </button>
                    <h2 className="text-lg font-bold text-slate-300">{t.room}: {roomName || roomId}</h2>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${role === 'white' ? 'bg-blue-600' : role === 'black' ? 'bg-red-600' : 'bg-slate-600'}`}>
                        {role === 'white' ? t.white : role === 'black' ? t.black : t.spectator}
                    </span>
                </div>

                {/* Timer & Encuentro Scoreboard */}
                <div className="flex gap-4 items-center">
                    {settings?.mode === 'encuentro' && (
                        <div className="flex items-center gap-3 bg-slate-900 px-4 py-1 rounded-full border border-slate-700 font-bold">
                            <span className="text-white">R{encuentroState?.currentRound || 1}</span>
                            <span className="text-slate-600">|</span>
                            <span className="text-blue-400">{encuentroState?.matchPoints?.white || 0}</span>
                            <span className="text-slate-500">-</span>
                            <span className="text-red-400">{encuentroState?.matchPoints?.black || 0}</span>
                        </div>
                    )}
                    <div className="flex gap-8 bg-slate-900 px-6 py-1 rounded-full border border-slate-700">
                        <div className={`text-xl font-mono font-bold ${timer.white < 60 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
                            {formatTime(timer.white)}
                        </div>
                        <div className="text-slate-600">|</div>
                        <div className={`text-xl font-mono font-bold ${timer.black < 60 ? 'text-red-500 animate-pulse' : 'text-red-400'}`}>
                            {formatTime(timer.black)}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {!boardResult && isPlayer && (
                        <>
                            <button
                                onClick={handleOfferDraw}
                                disabled={drawOfferedByMe}
                                className={`p-2 rounded-full transition-colors ${drawOfferedByMe ? 'bg-slate-600 cursor-not-allowed opacity-50' : 'bg-blue-900/50 hover:bg-blue-700 text-blue-200 border border-blue-800'}`}
                                title={t.offerDraw}
                            >
                                <Flag size={16} />
                            </button>
                            <button
                                onClick={handleResign}
                                className="p-2 rounded-full bg-slate-700 hover:bg-red-600 transition-colors text-slate-300 hover:text-white"
                                title={t.resign}
                            >
                                <LogOut size={16} />
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => {
                            if (settings?.voiceChat === false || settings?.voiceChat === 'false') return;
                            setMicOn(!micOn);
                        }}
                        disabled={settings?.voiceChat === false || settings?.voiceChat === 'false'}
                        className={`p-2 rounded-full transition-colors ${settings?.voiceChat === false || settings?.voiceChat === 'false' ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : micOn ? 'bg-green-600' : 'bg-slate-700 hover:bg-slate-600'} ${!isPlayer ? 'hidden' : ''}`}
                        title={settings?.voiceChat === false || settings?.voiceChat === 'false' ? t.voiceChatDisabledBySettings : t.voiceChat}
                    >
                        {micOn ? <Mic size={16} /> : <MicOff size={16} />}
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {(role === 'spectator' || isBench) ? (
                    <SpectatorView
                        data={spectatorData}
                        socket={socket}
                        roomId={roomId}
                        t={t}
                        getPieceIcon={getPieceIcon}
                        isBench={isBench}
                        settings={settings}
                    />
                ) : (
                    <>
                        {/* Center: Board & Visualizer */}
                        <div className="flex-1 flex flex-col min-w-0">

                            {/* Top: The Game Board or Waiting Screen */}
                            <div className="flex-1 flex items-center justify-center p-4 min-h-0 relative z-10 overflow-hidden max-h-[50vh]">
                                <div key={showVisualizer ? 'v-open' : 'v-closed'} className="h-full max-w-full aspect-square relative shadow-2xl">
                                    {boardResult ? (
                                        <div className="absolute inset-0 bg-slate-900/90 z-20 flex flex-col items-center justify-center text-center p-8 rounded border border-slate-700">
                                            <h2 className="text-3xl font-bold mb-4">{t.confrontationOver}</h2>
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
                                                    <span className={`font-mono ${(boardResult.winner === (pieceColor || role) || !boardResult.winner) ? 'text-green-400' : 'text-slate-500'}`}>
                                                        +{(boardResult.winner === (pieceColor || role) || !boardResult.winner) ? boardResult.points : 0} {t.pts}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <ChessBoard socket={socket} roomId={roomId} role={pieceColor || role} fen={gameState?.fen} />
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

                                                const isBoardMode = settings?.boardMode === 'board';
                                                const currentViewMode = teammateViewModes[board.boardId] || (isBoardMode ? 'board' : 'heatmap');

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

                                                                {/* Visualizer Content (Board or Heatmap) */}
                                                                <div className="flex-1 flex items-center justify-center min-h-0 relative group">
                                                                    <div style={{ aspectRatio: '1/1', height: '100%', maxHeight: '100%', width: 'auto' }}>
                                                                        {currentViewMode === 'board' ? (
                                                                            <div className="w-full h-full pointer-events-none">
                                                                                <ChessBoard socket={socket} roomId={roomId} role="spectator" fen={board.fen} />
                                                                            </div>
                                                                        ) : (
                                                                            <Heatmap data={board.heatmap} orientation={role} />
                                                                        )}
                                                                    </div>
                                                                    {isBoardMode && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setTeammateViewModes(prev => ({
                                                                                    ...prev,
                                                                                    [board.boardId]: currentViewMode === 'board' ? 'heatmap' : 'board'
                                                                                }));
                                                                            }}
                                                                            className="absolute top-2 right-2 p-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity border border-slate-700 shadow-xl z-20"
                                                                            title={currentViewMode === 'board' ? t.toggleHeatmap : t.toggleBoard}
                                                                        >
                                                                            {currentViewMode === 'board' ? <Activity size={16} /> : <Eye size={16} />}
                                                                        </button>
                                                                    )}
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
                    </>
                )}
            </div >
        </div >
    );
}

function SpectatorView({ data, socket, roomId, t, getPieceIcon, isBench, settings }) {
    const [viewModes, setViewModes] = useState({});

    if (!data || data.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-slate-500">
                <div className="text-center">
                    <Activity size={48} className="mx-auto mb-4 opacity-50" />
                    <p>{t.waitingForData}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {data.map((board) => (
                <div key={board.boardId} className="bg-slate-800/30 p-6 rounded-3xl border border-slate-700/50 shadow-xl">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="text-blue-400">{board.white}</span>
                            <span className="text-slate-600">vs</span>
                            <span className="text-red-400">{board.black}</span>
                        </h3>
                        <div className="text-xs font-mono text-slate-500">{t.board} {board.boardId + 1}</div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-12 h-[380px] justify-center items-center">
                        {/* Left: Board or Heatmap based on settings */}
                        <div className="w-[380px] h-[380px] bg-slate-900/50 rounded-xl shadow-inner border border-slate-700/50 flex-none relative group overflow-hidden">
                            {(!isBench || settings?.encuentroBenchView === 'board' || viewModes[board.boardId] === 'board') && viewModes[board.boardId] !== 'heatmap' ? (
                                <div className="w-full h-full p-2 pointer-events-none">
                                    <ChessBoard socket={socket} roomId={roomId} role="spectator" fen={board.fen} />
                                </div>
                            ) : (
                                <div className="w-full h-full p-2">
                                    <Heatmap data={board.heatmap} orientation="white" />
                                </div>
                            )}

                            {isBench && settings?.encuentroBenchView === 'board' && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setViewModes(prev => ({
                                            ...prev,
                                            [board.boardId]: (prev[board.boardId] || 'board') === 'board' ? 'heatmap' : 'board'
                                        }));
                                    }}
                                    className="absolute top-4 right-4 p-2 bg-slate-900/90 hover:bg-slate-800 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity border border-slate-700 shadow-xl z-20 pointer-events-auto"
                                    title={viewModes[board.boardId] === 'heatmap' ? t.toggleBoard : t.toggleHeatmap}
                                >
                                    {viewModes[board.boardId] === 'heatmap' ? <Activity size={18} /> : <Activity size={18} />}
                                </button>
                            )}
                        </div>

                        {/* Right: Visualizer */}
                        <div className="w-[380px] h-full flex gap-4 flex-none">
                            {/* Main Visualizer Container */}
                            <div className="flex-1 flex flex-col bg-slate-800 rounded-xl border border-slate-700 relative shadow-xl p-3">
                                {/* Top: Black Info */}
                                <div className="h-10 flex items-center justify-between gap-2 mb-2">
                                    <div className="flex-1 h-full flex items-center justify-center gap-1 bg-slate-900/50 rounded overflow-hidden px-2">
                                        {board.captures?.w?.length > 0 ? board.captures.w.map((p, i) => (
                                            <span key={i} className="text-xl text-slate-400">
                                                {getPieceIcon(p, 'b')}
                                            </span>
                                        )) : <span className="text-xs text-slate-600">-</span>}
                                    </div>
                                    <div className="flex gap-2 h-full">
                                        {board.kingStatus?.b && (
                                            <div className="h-full aspect-square flex items-center justify-center bg-slate-900/50 rounded border border-slate-700/50">
                                                <Shield status={board.kingStatus.b.status} isCastled={board.kingStatus.b.isCastled} />
                                            </div>
                                        )}
                                        {board.burnLevel?.b !== undefined && (
                                            <div className="h-full aspect-square flex items-center justify-center bg-slate-900/50 rounded border border-slate-700/50">
                                                <Flame level={board.burnLevel.b} />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Visualizer Content */}
                                <div className="flex-1 flex items-center justify-center min-h-0 relative">
                                    <div style={{ aspectRatio: '1/1', height: '100%', maxHeight: '100%', width: 'auto' }}>
                                        {/* In Spectator view, we always show heatmap, but we could add toggle here too. Currently User requested it for teammate visualizer */}
                                        <Heatmap data={board.heatmap} orientation="white" />
                                    </div>
                                </div>

                                {/* Bottom: White Info */}
                                <div className="h-10 flex items-center justify-between gap-2 mt-2">
                                    <div className="flex-1 h-full flex items-center justify-center gap-1 bg-slate-900/50 rounded overflow-hidden px-2">
                                        {board.captures?.b?.length > 0 ? board.captures.b.map((p, i) => (
                                            <span key={i} className="text-xl text-white">
                                                {getPieceIcon(p, 'w')}
                                            </span>
                                        )) : <span className="text-xs text-slate-600">-</span>}
                                    </div>
                                    <div className="flex gap-2 h-full">
                                        {board.kingStatus?.w && (
                                            <div className="h-full aspect-square flex items-center justify-center bg-slate-900/50 rounded border border-slate-700/50">
                                                <Shield status={board.kingStatus.w.status} isCastled={board.kingStatus.w.isCastled} />
                                            </div>
                                        )}
                                        {board.burnLevel?.w !== undefined && (
                                            <div className="h-full aspect-square flex items-center justify-center bg-slate-900/50 rounded border border-slate-700/50">
                                                <Flame level={board.burnLevel.w} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Thermometer */}
                            <div className="w-8 h-full bg-slate-800 rounded-full relative border border-slate-700 overflow-hidden shrink-0">
                                <Thermometer score={board.analysis?.score || 0} orientation="white" />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
