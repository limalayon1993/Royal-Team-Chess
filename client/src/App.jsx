import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { Lobby } from './components/Lobby';
import { GameRoom } from './components/GameRoom';
import { ErrorBoundary } from './components/ErrorBoundary';

import { InfoModal } from './components/InfoModal';
import { Info, Globe, Wifi } from 'lucide-react';
import { translations } from './translations';

function RoyalTeamChess({ socket, language, toggleLanguage }) {
  const [room, setRoom] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [roomData, setRoomData] = useState({
    players: { white: [], black: [], spectators: [] },
    ready: { white: [], black: [] },
    settings: {},
    active: false
  });
  const [gameState, setGameState] = useState(null);
  const [myBoardId, setMyBoardId] = useState(null);
  const myBoardIdRef = useRef(null); // Ref to access latest ID in callbacks
  const [teammateBoards, setTeammateBoards] = useState([]);
  const [timer, setTimer] = useState({ white: 600, black: 600 });
  const [roomIdInput, setRoomIdInput] = useState('');
  const [username, setUsername] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [boardResult, setBoardResult] = useState(null); // { winner, reason, points }

  console.log('App Render:', { active: roomData.active, myBoardId, gameState: !!gameState, socketId: socket.id });

  const t = translations[language];

  useEffect(() => {
    socket.on('roomCreated', (id) => {
      setRoom(id);
    });

    socket.onAny((event, ...args) => {
      console.log(`[Socket Incoming] ${event}`, args);
    });

    socket.on('joinedRoom', ({ roomId, settings }) => {
      setRoom(roomId);
      setRoomData(prev => ({ ...prev, settings }));
    });

    socket.on('roomUpdate', (data) => {
      setRoomData(data);
    });

    socket.on('gameStart', (data) => {
      console.log('Game Start Event:', data);
      // data: { boards: [{ id, white, black }] }
      const myBoard = data.boards.find(b => b.white === socket.id || b.black === socket.id);
      if (myBoard) {
        console.log('Found my board:', myBoard.id);
        setMyBoardId(myBoard.id);
        myBoardIdRef.current = myBoard.id;
        setBoardResult(null); // Reset result on new game
      } else {
        console.error('Could not find my board in gameStart data', socket.id);
      }
    });

    socket.on('gameState', (state) => {
      // Always update if received, as server filters for us.
      setGameState(prev => ({ ...prev, ...state }));
    });

    socket.on('visualizerUpdate', (boardsData) => {
      // Filter out my board using ref
      const others = boardsData.filter(b => b.boardId !== myBoardIdRef.current);
      setTeammateBoards(others);
    });

    socket.on('boardGameOver', (result) => {
      // result: { boardId, winner, reason, points, scores }
      if (result.boardId === myBoardIdRef.current) {
        setBoardResult(result);
      }
    });

    socket.on('matchOver', (result) => {
      // result: { winner, scores, details }
      setGameState(prev => ({ ...prev, matchResult: result }));
    });

    socket.on('timerUpdate', (t) => {
      console.log('Client Timer Update:', t);
      setTimer(t);
    });

    socket.on('error', (msg) => alert(msg));

    return () => {
      socket.off('roomCreated');
      socket.off('joinedRoom');
      socket.off('roomUpdate');
      socket.off('gameStart');
      socket.off('gameState');
      socket.off('visualizerUpdate');
      socket.off('boardGameOver');
      socket.off('matchOver');
      socket.off('timerUpdate');
      socket.off('error');
    };
  }, [socket]);

  const createRoom = () => {
    if (!username) {
      alert(t.usernamePlaceholder || "Please enter a username");
      return;
    }
    console.log('Creating room...', { socketId: socket?.id, connected: socket?.connected });
    const id = Math.random().toString(36).substring(7);
    setIsCreator(true);
    socket.emit('createRoom', { roomId: id, username, settings: { time: 600, teamSize: 2 } });
  };

  const joinRoom = () => {
    if (!roomIdInput || !username) return;
    socket.emit('joinRoom', { roomId: roomIdInput, username });
  };

  // Determine my role
  const myId = socket.id;
  const myRole = roomData.players.white.includes(myId) ? 'white' :
    roomData.players.black.includes(myId) ? 'black' : 'spectator';

  if (!room) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white relative">
        {/* Language Toggle */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors text-sm font-bold text-slate-300 hover:text-white"
          >
            <Globe size={16} />
            {language === 'en' ? 'ESPAÑOL' : 'ENGLISH'}
          </button>
        </div>

        {showInfo && <InfoModal onClose={() => setShowInfo(false)} language={language} />}

        <div className="glass-panel p-8 max-w-md w-full text-center">
          <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            {t.title}
          </h1>
          <div className="space-y-4">

            {/* Username Input - Global for both Create and Join */}
            <div className="text-left">
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">
                {t.usernamePlaceholder || "Username"}
              </label>
              <input
                type="text"
                placeholder="Player Name"
                className="input-field w-full"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="border-t border-slate-700 my-4"></div>

            <button
              onClick={createRoom}
              className={`btn-primary w-full py-3 text-lg ${!username ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!username}
            >
              {t.createRoom}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-800 text-slate-400">{t.orJoin}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t.roomIdPlaceholder}
                className="input-field flex-1"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
              />
              <button
                onClick={joinRoom}
                className="btn-primary"
                disabled={!roomIdInput || !username}
              >
                {t.join}
              </button>
            </div>

            <button
              onClick={() => setShowInfo(true)}
              className="mt-6 w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider py-2 border border-slate-700 rounded hover:bg-slate-800"
            >
              <Info size={16} /> {t.projectInfo}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState?.matchResult) {
    const { winner, scores, details } = gameState.matchResult;
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="glass-panel p-8 max-w-2xl w-full text-center">
          <h1 className="text-5xl font-bold mb-4">
            {winner === 'draw' ? t.matchDrawn : `${winner.toUpperCase()} ${t.wins}`}
          </h1>
          <div className="flex justify-center gap-12 text-3xl font-mono mb-8">
            <div className="text-blue-400">{t.white}: {scores.white}</div>
            <div className="text-red-400">{t.black}: {scores.black}</div>
          </div>

          <div className="space-y-2 text-left bg-slate-800 p-4 rounded">
            <h3 className="font-bold text-slate-400 mb-2">{t.boardDetails}:</h3>
            {details.map((d, i) => (
              <div key={i} className="flex justify-between border-b border-slate-700 py-1">
                <span>{t.board} {d.boardId + 1}</span>
                <span>{d.winner.toUpperCase()} ({d.reason})</span>
                <span>+{d.points} pts</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => window.location.reload()}
            className="btn-primary mt-8 w-full"
          >
            {t.backToLobby}
          </button>
        </div>
      </div>
    );
  }

  if (!roomData.active) {
    return (
      <Lobby
        socket={socket}
        roomId={room}
        settings={roomData.settings}
        players={roomData.players}
        ready={roomData.ready}
        isCreator={isCreator}
        language={language}
      />
    );
  }

  return (
    <ErrorBoundary>
      <GameRoom
        socket={socket}
        roomId={room}
        role={myRole}
        gameState={gameState}
        teammateBoards={teammateBoards}
        timer={timer}
        boardResult={boardResult}
        language={language}
      />
    </ErrorBoundary>
  );
}

function App() {
  const [socket, setSocket] = useState(null);
  // Use environment variable for server URL if available (Production), otherwise default to localhost
  const [serverUrl, setServerUrl] = useState(import.meta.env.VITE_SERVER_URL || 'http://localhost:3000');
  const [language, setLanguage] = useState('en');
  const [showInfo, setShowInfo] = useState(false);

  const t = translations[language];

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'es' : 'en');
  };

  // Auto-connect if VITE_SERVER_URL is present (Production Mode)
  useEffect(() => {
    if (import.meta.env.VITE_SERVER_URL) {
      console.log('Connecting to production server:', import.meta.env.VITE_SERVER_URL);
      const newSocket = io(import.meta.env.VITE_SERVER_URL);
      setSocket(newSocket);
    }
  }, []);

  const connect = (e) => {
    e.preventDefault();
    const newSocket = io(serverUrl);
    setSocket(newSocket);
  };

  if (!socket) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white relative">
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors text-sm font-bold text-slate-300 hover:text-white"
          >
            <Globe size={16} />
            {language === 'en' ? 'ESPAÑOL' : 'ENGLISH'}
          </button>
        </div>

        {showInfo && <InfoModal onClose={() => setShowInfo(false)} language={language} />}

        <div className="glass-panel p-8 max-w-md w-full text-center">
          <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            {t.title}
          </h1>

          {/* Only show manual connect form if NOT in production (or if connection failed/not auto-started) */}
          {!import.meta.env.VITE_SERVER_URL && (
            <form onSubmit={connect} className="space-y-4">
              <div className="text-left">
                <label className="block text-sm font-bold text-slate-400 mb-1">Server URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-field flex-1"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Default: http://localhost:3000 (Local)<br />
                  LAN: http://192.168.x.x:3000
                </p>
              </div>
              <button type="submit" className="btn-primary w-full py-3 text-lg flex items-center justify-center gap-2">
                <Wifi size={20} /> Connect
              </button>
              <button
                type="button"
                onClick={() => setShowInfo(true)}
                className="mt-4 w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider py-2 border border-slate-700 rounded hover:bg-slate-800"
              >
                <Info size={16} /> {t.projectInfo}
              </button>
            </form>
          )}

          {/* Show loading/info if in production and connecting */}
          {import.meta.env.VITE_SERVER_URL && (
            <div className="space-y-4">
              <p className="text-slate-400 animate-pulse">Connecting to server...</p>
              <button
                type="button"
                onClick={() => setShowInfo(true)}
                className="mt-4 w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider py-2 border border-slate-700 rounded hover:bg-slate-800"
              >
                <Info size={16} /> {t.projectInfo}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <RoyalTeamChess socket={socket} language={language} toggleLanguage={toggleLanguage} />;
}

export default App;
