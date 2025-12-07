import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { Lobby } from './components/Lobby';
import { GameRoom } from './components/GameRoom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UserProfile } from './components/UserProfile';

import { Globe, Wifi, Mail, Lock } from 'lucide-react';
import { translations } from './translations';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { ContactModal } from './components/ContactModal';
import { AuthModal } from './components/AuthModal';
import { AuthProvider, useAuth } from './context/AuthContext';

function RoyalTeamChess({ socket, language, toggleLanguage }) {
  const { user, recoveryMode, setRecoveryMode } = useAuth();
  const [room, setRoom] = useState(null);
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
  const [spectatorData, setSpectatorData] = useState([]);
  const [timer, setTimer] = useState({ white: 600, black: 600 });
  const [roomIdInput, setRoomIdInput] = useState('');
  const [username, setUsername] = useState(user?.user_metadata?.username || '');
  const [isCreator, setIsCreator] = useState(false);
  const [boardResult, setBoardResult] = useState(null); // { winner, reason, points }
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    if (user?.user_metadata?.username) {
      setUsername(user.user_metadata.username);
    }
  }, [user]);

  console.log('App Render:', { active: roomData.active, myBoardId, gameState: !!gameState, socketId: socket.id });

  const t = translations[language];

  const [roomsList, setRoomsList] = useState([]);

  useEffect(() => {
    socket.on('roomCreated', (id) => {
      setRoom(id);
    });

    socket.onAny((event, ...args) => {
      console.log(`[Socket Incoming] ${event}`, args);
    });

    socket.on('joinedRoom', ({ roomId, settings, roomName }) => {
      setRoom(roomId);
      setRoomData(prev => ({ ...prev, settings, name: roomName }));
    });

    socket.on('roomUpdate', (data) => {
      setRoomData(data);
    });

    socket.on('roomsList', (rooms) => {
      console.log('[App] Received roomsList:', rooms);
      setRoomsList(rooms);
    });

    // Fetch rooms on load/connect
    if (socket.connected) {
      console.log('[App] Requesting initial rooms list');
      socket.emit('getRooms');
    }

    socket.on('gameStart', (data) => {
      console.log('Game Started:', data);
      setRoomData(prev => ({ ...prev, active: true }));
      setGameState(data);

      // Identify my board
      const myBoardIndex = data.boards.findIndex(b =>
        b.white === socket.id || b.black === socket.id
      );

      if (myBoardIndex !== -1) {
        setMyBoardId(myBoardIndex);
        myBoardIdRef.current = myBoardIndex;
      }

      // Identify teammates
      // ... (logic handled in GameRoom usually, but we can set initial state here)
    });

    socket.on('gameState', (data) => {
      setGameState(data);
    });

    socket.on('visualizerUpdate', (data) => {
      // data is an array of board states from the server
      setTeammateBoards(data);
    });

    socket.on('spectatorUpdate', (data) => {
      setSpectatorData(data);
    });

    socket.on('boardGameOver', ({ boardId, winner, reason, points }) => {
      // Handled in GameRoom
    });

    socket.on('matchOver', ({ winner, scores, details }) => {
      setGameState(prev => ({ ...prev, matchResult: { winner, scores, details } }));
    });

    socket.on('timerUpdate', (newTimer) => {
      setTimer(newTimer);
    });

    socket.on('error', (msg) => alert(msg));

    return () => {
      socket.off('roomCreated');
      socket.off('joinedRoom');
      socket.off('roomUpdate');
      socket.off('roomsList');
      socket.off('gameStart');
      socket.off('gameState');
      socket.off('visualizerUpdate');
      socket.off('spectatorUpdate');
      socket.off('boardGameOver');
      socket.off('matchOver');
      socket.off('timerUpdate');
      socket.off('error');
    };
  }, [socket]);

  const resetGame = () => {
    if (room) {
      socket.emit('leaveRoom');
    }
    setRoom(null);
    setRoomData({
      players: { white: [], black: [], spectators: [] },
      ready: { white: [], black: [] },
      settings: {},
      active: false
    });
    setGameState(null);
    setMyBoardId(null);
    setTeammateBoards([]);
    setSpectatorData([]);
    setBoardResult(null);
    setIsCreator(false);
  };

  const createRoom = (roomData) => {
    console.log('App: createRoom called', roomData);
    // roomData: { name, isPrivate, password, teamSize, time, language }
    if (!username) {
      alert(t.usernamePlaceholder || "Please enter a username");
      return;
    }

    if (!socket || !socket.connected) {
      console.error('Socket not connected', socket);
      alert('Connection to server lost. Please wait or refresh.');
      return;
    }

    console.log('Creating room...', {
      socketId: socket.id,
      username,
      connected: socket.connected,
      ...roomData,
      settings: {
        time: parseInt(roomData.time) * 60,
        teamSize: parseInt(roomData.teamSize)
      }
    });

    const id = Math.random().toString(36).substring(7);

    // Optimistically update local state so Lobby shows correct settings immediately
    setRoomData(prev => ({
      ...prev,
      ...roomData,
      settings: {
        time: parseInt(roomData.time) * 60,
        teamSize: parseInt(roomData.teamSize)
      }
    }));

    setIsCreator(true);

    socket.emit('createRoom', {
      roomId: id,
      username,
      roomName: roomData.name,
      isPrivate: roomData.isPrivate,
      password: roomData.password,
      language: roomData.language,
      settings: {
        time: parseInt(roomData.time) * 60, // Convert minutes to seconds
        teamSize: parseInt(roomData.teamSize)
      }
    });
  };

  const joinRoom = (roomId, password = null) => {
    console.log('App: joinRoom called', { roomId, username, password });
    if (!roomId) return;

    if (!username) {
      console.error('App: joinRoom failed - missing username');
      alert(t.usernamePlaceholder || "Please enter a username first");
      return;
    }
    socket.emit('joinRoom', { roomId, username, password });
  };

  const handlePlayAsGuest = (guestName) => {
    setUsername(guestName);
  };

  const refreshRooms = () => {
    socket.emit('getRooms');
  };

  // Determine my role
  const myId = socket.id;
  const myRole = roomData.players.white.includes(myId) ? 'white' :
    roomData.players.black.includes(myId) ? 'black' : 'spectator';

  if (recoveryMode) {
    return (
      <AuthModal
        onClose={() => setRecoveryMode(false)}
        language={language}
        initialView="updatePassword"
      />
    );
  }

  if (!room) {
    return (
      <ErrorBoundary>
        <LandingPage
          onPlayAsGuest={handlePlayAsGuest}
          language={language}
          toggleLanguage={toggleLanguage}
          roomsList={roomsList}
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          onRefreshRooms={refreshRooms}
          username={username}
        />
      </ErrorBoundary>
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
            onClick={resetGame}
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
        roomName={roomData.name}
        settings={roomData.settings}
        players={roomData.players}
        ready={roomData.ready}
        isCreator={isCreator}
        language={language}
        onLeave={resetGame}
        usernames={roomData.usernames}
      />
    );
  }

  return (
    <ErrorBoundary>
      <GameRoom
        socket={socket}
        roomId={room}
        roomName={roomData.name}
        role={myRole}
        gameState={gameState}
        teammateBoards={teammateBoards}
        spectatorData={spectatorData}
        timer={timer}
        boardResult={boardResult}
        language={language}
        onLeave={resetGame}
        myBoardId={myBoardId}
      />
    </ErrorBoundary>
  );
}

// The main game logic component (formerly App)
function GameApp({ language, toggleLanguage }) {
  const [socket, setSocket] = useState(() => {
    // Force localhost for local development to ensure we hit the local server
    const url = import.meta.env.DEV ? 'http://localhost:3000' : (import.meta.env.VITE_SERVER_URL || 'http://localhost:3000');
    console.log('Initializing socket connection to:', url);
    return io(url);
  });
  const [serverUrl, setServerUrl] = useState(import.meta.env.VITE_SERVER_URL || 'http://localhost:3000');
  const [showContact, setShowContact] = useState(false);

  const t = translations[language];

  // Manual connect fallback (unlikely to be seen if socket init works)
  const connect = (e) => {
    e.preventDefault();
    const newSocket = io(serverUrl);
    setSocket(newSocket);
  };

  if (!socket) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white relative">
        {showContact && <ContactModal onClose={() => setShowContact(false)} language={language} />}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-4">
          <button
            onClick={() => setShowContact(true)}
            className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider"
          >
            <Mail size={16} />
            {t.contact}
          </button>
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors text-sm font-bold text-slate-300 hover:text-white"
          >
            <Globe size={16} />
            {language === 'en' ? 'ESPAÑOL' : 'ENGLISH'}
          </button>
        </div>

        <div className="glass-panel p-8 max-w-md w-full text-center">
          <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            {t.title}
          </h1>

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
          </form>

          <a href="/" className="mt-6 block text-slate-500 hover:text-slate-300 text-sm underline">
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return <RoyalTeamChess socket={socket} language={language} toggleLanguage={toggleLanguage} />;
}

function App() {
  const [language, setLanguage] = useState('en');

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'es' : 'en');
  };

  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/"
          element={
            <GameApp
              language={language}
              toggleLanguage={toggleLanguage}
            />
          }
        />
        <Route path="/profile/:userId" element={<UserProfile language={language} />} />
        <Route path="*" element={<GameApp language={language} toggleLanguage={toggleLanguage} />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
