import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Crown, Users, Activity, Shield, Flame, Thermometer, Play, Globe, MessageSquare, Trophy, Target, Zap, Mail, LogOut, User, UserPlus, Search, Lock, Unlock, Plus, RefreshCw, Server, Clock, Eye, UserCircle, Users2 } from 'lucide-react';
import { translations } from '../translations';
import { ContactModal } from './ContactModal';
import { AuthModal } from './AuthModal';
import { SocialPanel } from './SocialPanel';
import { ChatModal } from './ChatModal';
import { useAuth } from '../context/AuthContext';

export function LandingPage({ onPlayAsGuest, language, toggleLanguage, roomsList, onCreateRoom, onJoinRoom, onRefreshRooms, username, user, initialView = 'landing', socket, party, onPartyCreate, onPartyInvite, onPartyJoin, onPartyLeave, onOpenParty, onJoinParty, onAcceptProposal }) {
    console.log('[Landing] Render. onAcceptProposal present?', !!onAcceptProposal);
    const navigate = useNavigate();
    const location = useLocation();
    const t = translations[language];
    const { user: contextUser, signOut } = useAuth();

    // Prefer prop user, fallback to context
    const currentUser = user || contextUser;

    const [showContact, setShowContact] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [chatTargetUser, setChatTargetUser] = useState(null);
    const [showAuth, setShowAuth] = useState(false);
    const [authView, setAuthView] = useState('login');
    const [menuView, setMenuView] = useState(initialView);
    const [unreadCount, setUnreadCount] = useState(0); // Added missing state

    useEffect(() => {
        if (!currentUser && menuView === 'main') {
            setMenuView('landing');
            window.history.pushState({}, '', '/');
        }
    }, [currentUser, menuView]);

    // Handle navigation state and URL routes
    useEffect(() => {
        if (location.pathname === '/main') {
            setMenuView('main');
        } else if (location.state?.view) {
            setMenuView(location.state.view);
            // Clear state to prevent looping
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // ... State for Create Room ...
    const [newRoomName, setNewRoomName] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [roomPassword, setRoomPassword] = useState('');
    const [teamSize, setTeamSize] = useState('2');
    const [timeControl, setTimeControl] = useState('10');
    const [roomLanguage, setRoomLanguage] = useState('en');

    // ... State for Browser ...
    const [browserSearch, setBrowserSearch] = useState('');
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [joinPassword, setJoinPassword] = useState('');

    // Matchmaking State
    const [searchStatus, setSearchStatus] = useState('idle'); // idle, searching, found

    // Socket Listeners for Matchmaking
    useEffect(() => {
        console.log("LandingPage mounted. Socket:", socket ? "Connected (" + socket.id + ")" : "Undefined");
        if (!socket) return;

        const handleMatchStatus = (data) => {
            console.log("Matchmaking status:", data);
            if (data.status === 'searching') setSearchStatus('searching');
            if (data.status === 'found') {
                setSearchStatus('found');
                // The joinRoom handling logic elsewhere should pick up the room join
                // But we can also set timeout to reset status or wait for 'joinedRoom'
            }
        };

        socket.on('matchmakingStatus', handleMatchStatus);

        return () => {
            socket.off('matchmakingStatus', handleMatchStatus);
        };
    }, []);

    // Fetch unread messages count
    useEffect(() => {
        if (!user) return;

        const fetchUnread = async () => {
            const { count, error } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('receiver_id', user.id)
                .eq('is_read', false);

            if (!error) {
                setUnreadCount(count || 0);
            }
        };

        fetchUnread();

        // Subscribe to new messages
        const channel = supabase
            .channel('badge-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => {
                fetchUnread();
            })
            .subscribe();

        // Custom event for instant local updates (when ChatModal marks as read)
        const handleBadgeUpdate = () => fetchUnread();
        window.addEventListener('messages-read', handleBadgeUpdate);
        window.addEventListener('friend-updated', handleBadgeUpdate); // Also update on friend events if relevant

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('messages-read', handleBadgeUpdate);
            window.removeEventListener('friend-updated', handleBadgeUpdate);
        };
    }, [user]);

    // ... State for Quick Match ...

    // ... State for Quick Match ...
    const [quickTime, setQuickTime] = useState('any');
    const [quickTeamSize, setQuickTeamSize] = useState('any');
    const [quickLanguage, setQuickLanguage] = useState('any');

    // ... State for User Search ...
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userSearchResults, setUserSearchResults] = useState([]);
    const [showUserDropdown, setShowUserDropdown] = useState(false);

    const handleUserSearch = async (query) => {
        setUserSearchQuery(query);
        if (query.length < 2) {
            setUserSearchResults([]);
            setShowUserDropdown(false);
            return;
        }

        setShowUserDropdown(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, team')
                .ilike('username', `${query}%`) // Starts with query, case insensitive
                .limit(5);

            if (error) throw error;

            let results = data || [];

            // DEMO: Always include mock if query matches 'ant'
            if (query.toLowerCase().includes('ant')) {
                results.push({ id: 'mock-1', username: 'Antonio', team: 'Devs', avatar_url: null });
            }

            setUserSearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
            // Fallback for demo if no DB
            if (query.toLowerCase().includes('ant')) {
                setUserSearchResults([{ id: 'mock-1', username: 'Antonio', team: 'Devs' }]);
            }
        }
    };

    useEffect(() => {
        if (menuView === 'quick' || menuView === 'browser') {
            onRefreshRooms();
        }
    }, [menuView, onRefreshRooms]);

    const handleGuestLogin = (name) => {
        const guestName = name || `Guest_${Math.floor(Math.random() * 9000) + 1000}`;
        onPlayAsGuest(guestName);
        setMenuView('main');
    };

    const handlePlayNow = () => {
        if (user || username) {
            setMenuView('main');
            window.history.pushState({}, '', '/main');
        } else {
            openAuth('options');
        }
    };

    const openAuth = (view) => {
        setAuthView(view);
        setShowAuth(true);
    };

    const handleCreateRoom = () => {
        console.log('LandingPage: handleCreateRoom called', { newRoomName, isPrivate });
        onCreateRoom({
            name: newRoomName,
            isPrivate,
            password: roomPassword,
            teamSize,
            time: timeControl,
            language: roomLanguage
        });
    };

    const handleJoinRoom = (roomId, isPrivateRoom) => {
        console.log('LandingPage: handleJoinRoom clicked', { roomId, isPrivateRoom });
        if (isPrivateRoom) {
            setSelectedRoom(roomId);
        } else {
            onJoinRoom(roomId);
        }
    };

    const submitJoinPrivate = () => {
        onJoinRoom(selectedRoom, joinPassword);
        setSelectedRoom(null);
        setJoinPassword('');
    };

    // ... Render Functions ...
    const renderMainMenu = () => (
        <div className="max-w-6xl mx-auto w-full px-6 animate-fade-in flex flex-col items-center min-h-[600px] pt-12">

            {/* Search Bar */}
            <div className="w-full max-w-2xl mb-12 relative z-50">
                <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={24} />
                    <div className="absolute right-2 top-2 bottom-2 flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                        <select className="bg-transparent text-white text-sm font-bold px-4 focus:outline-none cursor-pointer hover:text-blue-400 transition-colors">
                            <option value="user">{t.player || "Player"}</option>
                            <option value="team">{t.team || "Team"}</option>
                        </select>
                    </div>
                    <input
                        type="text"
                        value={userSearchQuery}
                        onChange={(e) => handleUserSearch(e.target.value)}
                        onFocus={() => userSearchQuery.length >= 2 && setShowUserDropdown(true)}
                        onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)} // Delay to allow click
                        className="w-full bg-slate-900/80 border border-slate-700/50 rounded-2xl py-6 pl-16 pr-32 text-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-xl"
                        placeholder={t.searchPlaceholder || "Search players..."}
                    />

                    {/* Search Dropdown */}
                    {showUserDropdown && userSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
                            {userSearchResults.map(result => (
                                <button
                                    key={result.id}
                                    onClick={() => navigate(`/profile/${result.id}`)}
                                    className="w-full flex items-center gap-4 p-4 hover:bg-slate-800 transition-colors text-left border-b border-slate-800 last:border-0"
                                >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-0.5">
                                        <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
                                            {result.avatar_url ? (
                                                <img src={result.avatar_url} alt={result.username} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xs font-bold text-white">{result.username.substring(0, 2).toUpperCase()}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-bold text-white text-lg">{result.username}</div>
                                        <div className="text-xs text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                            <Shield size={10} /> {result.team || "Free Agent"}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Menu Layout */}
            {(menuView === 'main' || menuView === 'landing') && (
                <div className="w-full max-w-[1600px] mx-auto px-6 flex gap-8">

                    {/* Main Cards Grid - Takes up remaining space */}
                    <div className="flex-1 grid md:grid-cols-2 lg:grid-cols-3 gap-8 transition-all duration-500">
                        {/* Play Button */}
                        <button
                            onClick={() => setMenuView('play_modes')}
                            className="group relative h-[400px] rounded-3xl overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-blue-900/50 border border-slate-800 hover:border-blue-500/50 text-left bg-slate-900"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-slate-900 to-slate-900 z-10" />
                            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:32px_32px] z-0" />
                            <div className="absolute bottom-0 left-0 p-8 z-20 w-full">
                                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-900/50 group-hover:scale-110 transition-transform duration-300">
                                    <Play size={40} className="text-white ml-1" fill="currentColor" />
                                </div>
                                <h3 className="text-4xl font-black text-white mb-2">{t.play}</h3>
                                <p className="text-blue-200 text-sm font-medium leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                                    {t.quickMatchDesc || "Jump straight into the action."}
                                </p>
                            </div>
                        </button>

                        {/* Profile Button */}
                        <button
                            onClick={() => {
                                if (user) {
                                    navigate(`/profile/${user.id}`);
                                } else {
                                    openAuth('login');
                                }
                            }}
                            className="group relative h-[400px] rounded-3xl overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-900/50 border border-slate-800 hover:border-purple-500/50 text-left bg-slate-900"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-slate-900 to-slate-900 z-10" />
                            <div className="absolute bottom-0 left-0 p-8 z-20 w-full">
                                <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-900/50 group-hover:scale-110 transition-transform duration-300">
                                    <UserCircle size={40} className="text-white" />
                                </div>
                                <h3 className="text-4xl font-black text-white mb-2">{t.profile || "Profile"}</h3>
                                <p className="text-purple-200 text-sm font-medium leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                                    {t.profileSubtitle || "View your stats and history."}
                                </p>
                            </div>
                        </button>

                        {/* Teams Button */}
                        <button
                            onClick={() => alert('Teams page coming soon!')} // Placeholder
                            className="group relative h-[400px] rounded-3xl overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-900/50 border border-slate-800 hover:border-emerald-500/50 text-left bg-slate-900"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-slate-900 to-slate-900 z-10" />
                            <div className="absolute bottom-0 left-0 p-8 z-20 w-full">
                                <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-900/50 group-hover:scale-110 transition-transform duration-300">
                                    <Users2 size={40} className="text-white" />
                                </div>
                                <h3 className="text-4xl font-black text-white mb-2">{t.teams || "Teams"}</h3>
                                <p className="text-emerald-200 text-sm font-medium leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                                    {t.teamsSubtitle || "Manage your roster."}
                                </p>
                            </div>
                        </button>

                        {/* Messages Button */}
                        <button
                            onClick={() => setShowChat(true)}
                            className="group relative h-[400px] rounded-3xl overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-900/50 border border-slate-800 hover:border-cyan-500/50 text-left bg-slate-900"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-slate-900 to-slate-900 z-10" />
                            <div className="absolute bottom-0 left-0 p-8 z-20 w-full">
                                <div className="w-16 h-16 bg-cyan-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-cyan-900/50 group-hover:scale-110 transition-transform duration-300 relative">
                                    <MessageSquare size={40} className="text-white" />
                                    {/* Unread Badge */}
                                    {unreadCount > 0 && (
                                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full border-4 border-slate-900 flex items-center justify-center animate-pulse">
                                            <span className="text-[10px] font-bold text-white">{unreadCount}</span>
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-4xl font-black text-white mb-2">{t.messages || "Messages"}</h3>
                                <p className="text-cyan-200 text-sm font-medium leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                                    {t.messagesSubtitle || "Chat with friends and team."}
                                </p>
                            </div>
                        </button>

                        {/* Party Button */}
                        <button
                            onClick={onOpenParty} // Opens modal
                            className={`mt-8 w-full h-[120px] rounded-3xl overflow-hidden transition-all duration-500 border text-left flex items-center px-8 gap-6
                            ${party
                                    ? 'bg-indigo-900/40 border-indigo-500 hover:bg-indigo-900/60 hover:shadow-lg hover:shadow-indigo-500/30'
                                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 opacity-60 hover:opacity-100 hover:bg-slate-800'
                                }`}
                        >
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-300 ${party ? 'bg-indigo-600 shadow-indigo-500/50' : 'bg-slate-700'}`}>
                                {party ? <Crown size={32} className="text-white fill-current" /> : <UserPlus size={32} className="text-slate-400" />}
                            </div>
                            <div>
                                <h3 className={`text-2xl font-black mb-1 ${party ? 'text-white' : 'text-slate-400'}`}>
                                    {party ? (t.partyActive || "Party Active") : "Party"}
                                </h3>
                                <p className="text-sm font-medium opacity-80 text-slate-400">
                                    {party ? `${party.members.length} Members • ${party.leaderId === socket?.id ? "You are Leader" : "Member"}` : "Invite friends via Social Panel."}
                                </p>
                            </div>
                        </button>

                    </div>
                    {/* End Main Cards Grid */}

                    {/* Social Panel - Right Side */}
                    <SocialPanel
                        language={language}
                        onOpenChat={(targetUser) => {
                            setChatTargetUser(targetUser);
                            setShowChat(true);
                        }}
                        onInvite={(targetUser) => onPartyInvite(targetUser)}
                        socket={socket}
                    />
                </div>
            )}
            {/* End Main Menu Grid */}

            {showChat && (
                <ChatModal
                    isOpen={showChat}
                    onClose={() => {
                        setShowChat(false);
                        setChatTargetUser(null);
                    }}
                    language={language}
                    currentUser={currentUser}
                    initialChatUser={chatTargetUser}
                    onJoinParty={onJoinParty}
                    onAcceptProposal={onAcceptProposal}
                    party={party}
                />
            )}

            <button
                onClick={() => {
                    signOut();
                    setMenuView('landing');
                    window.history.pushState({}, '', '/');
                }}
                className="mt-16 flex items-center gap-3 text-slate-500 hover:text-white transition-all hover:scale-105 px-6 py-3 rounded-full hover:bg-slate-800"
            >
                <LogOut size={20} /> <span className="font-bold tracking-wide">{t.back || "LOGOUT"}</span>
            </button>
        </div >
    );

    const renderPlayMenu = () => (
        <div className="max-w-6xl mx-auto w-full px-6 animate-fade-in flex flex-col items-center justify-center min-h-[600px] pt-32">
            <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
                    {t.mainMenuTitle || "Choose Your Battlefield"}
                </h2>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                    {t.mainMenuSubtitle || "Select a game mode to begin your conquest. Play casually or compete for glory."}
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 w-full">
                {/* Quick Match */}
                <button
                    onClick={() => setMenuView('quick')}
                    className="group relative h-96 rounded-3xl overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-blue-900/50 border border-slate-800 hover:border-blue-500/50 text-left bg-slate-900"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-slate-900 to-slate-900 z-10" />
                    <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:32px_32px] z-0" />

                    <div className="absolute bottom-0 left-0 p-8 z-20 w-full">
                        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-900/50 group-hover:scale-110 transition-transform duration-300">
                            <Zap size={32} className="text-white" />
                        </div>
                        <h3 className="text-3xl font-black text-white mb-2">{t.quickMatch || "Quick Match"}</h3>
                        <p className="text-blue-200 text-sm font-medium leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                            {t.quickMatchDesc || "Jump straight into the action. We'll find the best game for you based on your skill level."}
                        </p>
                    </div>
                </button>

                {/* Server Browser */}
                <button
                    onClick={() => {
                        onRefreshRooms();
                        setMenuView('browser');
                    }}
                    className="group relative h-96 rounded-3xl overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-900/50 border border-slate-800 hover:border-purple-500/50 text-left bg-slate-900"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-slate-900 to-slate-900 z-10" />
                    <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:32px_32px] z-0" />

                    <div className="absolute bottom-0 left-0 p-8 z-20 w-full">
                        <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-900/50 group-hover:scale-110 transition-transform duration-300">
                            <Search size={32} className="text-white" />
                        </div>
                        <h3 className="text-3xl font-black text-white mb-2">{t.serverBrowser || "Server Browser"}</h3>
                        <p className="text-purple-200 text-sm font-medium leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                            {t.serverBrowserDesc || "Browse active public games. Filter by language, skill level, and game settings."}
                        </p>
                    </div>
                </button>

                {/* Create Server */}
                <button
                    onClick={() => setMenuView('create')}
                    className="group relative h-96 rounded-3xl overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-900/50 border border-slate-800 hover:border-emerald-500/50 text-left bg-slate-900"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-slate-900 to-slate-900 z-10" />
                    <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:32px_32px] z-0" />

                    <div className="absolute bottom-0 left-0 p-8 z-20 w-full">
                        <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-900/50 group-hover:scale-110 transition-transform duration-300">
                            <Server size={32} className="text-white" />
                        </div>
                        <h3 className="text-3xl font-black text-white mb-2">{t.createServer || "Create Server"}</h3>
                        <p className="text-emerald-200 text-sm font-medium leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                            {t.createServerDesc || "Host your own game. Customize rules, privacy settings, and invite your friends."}
                        </p>
                    </div>
                </button>
            </div>

            <button
                onClick={() => setMenuView('main')}
                className="mt-16 flex items-center gap-3 text-slate-500 hover:text-white transition-all hover:scale-105 px-6 py-3 rounded-full hover:bg-slate-800"
            >
                <LogOut size={20} /> <span className="font-bold tracking-wide">{t.back || "RETURN TO HOME"}</span>
            </button>
        </div>
    );

    const renderCreateServer = () => (
        <div className="max-w-3xl mx-auto w-full px-6 animate-fade-in flex flex-col items-center justify-center min-h-[600px]">
            <div className="text-center mb-8">
                <h2 className="text-4xl font-black text-white mb-2 flex items-center justify-center gap-4">
                    <div className="p-3 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-900/50">
                        <Server size={32} className="text-white" />
                    </div>
                    {t.createServer || "Create Server"}
                </h2>
                <p className="text-slate-400 text-lg">
                    {t.createServerSubtitle || "Configure your battlefield and invite your allies."}
                </p>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 w-full shadow-2xl">
                <div className="space-y-8">
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">{t.roomName || "Room Name"}</label>
                        <input
                            type="text"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-4 px-6 text-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                            placeholder="e.g. Grandmaster Arena"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">{t.teamSize || "Team Size"}</label>
                            <div className="relative">
                                <select
                                    value={teamSize}
                                    onChange={(e) => setTeamSize(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-4 px-6 text-lg text-white appearance-none focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
                                >
                                    <option value="1">1 vs 1</option>
                                    <option value="2">2 vs 2</option>
                                    <option value="3">3 vs 3</option>
                                    <option value="4">4 vs 4</option>
                                </select>
                                <Users className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={20} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">{t.timeControl || "Time Control"}</label>
                            <div className="relative">
                                <select
                                    value={timeControl}
                                    onChange={(e) => setTimeControl(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-4 px-6 text-lg text-white appearance-none focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
                                >
                                    <option value="5">5 Minutes</option>
                                    <option value="10">10 Minutes</option>
                                    <option value="20">20 Minutes</option>
                                    <option value="30">30 Minutes</option>
                                    <option value="40">40 Minutes</option>
                                    <option value="50">50 Minutes</option>
                                    <option value="60">60 Minutes</option>
                                </select>
                                <Activity className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={20} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">{t.language || "Language"}</label>
                            <div className="relative">
                                <select
                                    value={roomLanguage}
                                    onChange={(e) => setRoomLanguage(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-4 px-6 text-lg text-white appearance-none focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
                                >
                                    <option value="en">English</option>
                                    <option value="es">Español</option>
                                </select>
                                <Globe className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={20} />
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-800/40 rounded-2xl border border-slate-700/50 hover:border-emerald-500/30 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${isPrivate ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                    {isPrivate ? <Lock size={20} /> : <Unlock size={20} />}
                                </div>
                                <div>
                                    <span className="block font-bold text-white text-lg">{t.privateRoom || "Private Room"}</span>
                                    <span className="text-sm text-slate-400">Require a password to join</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsPrivate(!isPrivate)}
                                className={`w-14 h-8 rounded-full transition-colors relative ${isPrivate ? 'bg-emerald-500' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${isPrivate ? 'translate-x-7' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {isPrivate && (
                            <div className="animate-fade-in mt-4 pt-4 border-t border-slate-700/50">
                                <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">{t.password || "Password"}</label>
                                <input
                                    type="password"
                                    value={roomPassword}
                                    onChange={(e) => setRoomPassword(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500 transition-all"
                                    placeholder="Set a secret password"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={() => setMenuView('main')}
                            className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all hover:scale-105"
                        >
                            {t.cancel || "Cancel"}
                        </button>
                        <button
                            onClick={handleCreateRoom}
                            disabled={!newRoomName}
                            className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white rounded-xl font-bold transition-all hover:scale-105 shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
                        >
                            {t.create || "Create Server"} <Play size={20} fill="currentColor" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderBrowser = () => (
        <div className="max-w-5xl mx-auto w-full px-6 animate-fade-in h-[700px] flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-4xl font-black text-white flex items-center gap-4 mb-2">
                        <div className="p-3 bg-purple-600 rounded-xl shadow-lg shadow-purple-900/50">
                            <Search size={32} className="text-white" />
                        </div>
                        {t.serverBrowser || "Server Browser"}
                    </h2>
                    <p className="text-slate-400 text-lg ml-16">
                        {t.serverBrowserSubtitle || "Join active battles and prove your worth."}
                    </p>
                </div>
                <button
                    onClick={onRefreshRooms}
                    className="p-4 bg-slate-800 hover:bg-purple-600 rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-900/50 group border border-slate-700 hover:border-purple-400"
                >
                    <RefreshCw size={24} className="text-slate-400 group-hover:text-white transition-colors group-hover:rotate-180 duration-500" />
                </button>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 flex-1 flex flex-col shadow-2xl overflow-hidden">
                <div className="flex gap-4 mb-6">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors" size={24} />
                        <input
                            type="text"
                            value={browserSearch}
                            onChange={(e) => setBrowserSearch(e.target.value)}
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-4 pl-14 pr-4 text-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all"
                            placeholder={t.searchPlaceholder || "Search rooms by name..."}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {roomsList.filter(r => r.name.toLowerCase().includes(browserSearch.toLowerCase())).map(room => (
                        <div key={room.id} className="bg-slate-800/40 hover:bg-slate-800/80 p-6 rounded-2xl border border-slate-700/50 hover:border-purple-500/50 transition-all flex items-center justify-between group hover:shadow-lg hover:shadow-purple-900/10 hover:translate-x-1">
                            <div className="flex items-center gap-6">
                                <div className={`p-3 rounded-xl ${room.isMatchmaking ? 'bg-blue-600 text-white' : room.isPrivate ? 'bg-red-900/20 text-red-400' : 'bg-green-900/20 text-green-400'}`}>
                                    {room.isMatchmaking ? <Zap size={24} /> : room.isPrivate ? <Lock size={24} /> : <Unlock size={24} />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl text-white mb-1 group-hover:text-purple-300 transition-colors flex items-center gap-2">
                                        {room.name}
                                        {room.isMatchmaking && <span className="text-xs bg-blue-600 px-2 py-0.5 rounded text-white font-bold tracking-wider">RANKED</span>}
                                    </h3>
                                    <div className="flex items-center gap-4 text-sm text-slate-400">
                                        <span className="flex items-center gap-1.5 bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-700/50" title={t.players || "Players"}>
                                            <Users size={14} className="text-blue-400" /> {room.players}/{room.maxPlayers}
                                        </span>
                                        <span className="flex items-center gap-1.5 bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-700/50" title={t.spectators || "Spectators"}>
                                            <Eye size={14} className="text-purple-400" /> {room.spectators || 0}
                                        </span>
                                        <span className="flex items-center gap-1.5 bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-700/50" title={t.timePerTeam || "Time"}>
                                            <Clock size={14} className="text-orange-400" /> {Math.floor(room.settings?.time / 60)}m
                                        </span>
                                        <span className="flex items-center gap-1.5 bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-700/50 uppercase font-bold text-xs" title={t.language || "Language"}>
                                            <Globe size={14} className="text-green-400" /> {room.language || 'EN'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {room.isMatchmaking && !room.active ? (
                                <button
                                    disabled
                                    className="px-8 py-3 bg-slate-800 text-slate-500 rounded-xl font-bold border border-slate-700 cursor-not-allowed"
                                >
                                    {t.matchmakingOnly || "Matchmaking Only"}
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleJoinRoom(room.id, room.isPrivate)}
                                    className="px-8 py-3 bg-slate-700 hover:bg-purple-600 text-white rounded-xl font-bold transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-900/30 flex items-center gap-2"
                                >
                                    {room.active ? (
                                        <>
                                            {t.spectate || "Spectate"} <Eye size={16} fill="currentColor" />
                                        </>
                                    ) : (
                                        <>
                                            {t.join || "Join"} <Play size={16} fill="currentColor" />
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    ))}
                    {roomsList.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-60">
                            <Server size={64} className="mb-4" />
                            <p className="text-xl font-medium">{t.noRooms || "No active rooms found."}</p>
                            <p className="text-sm mt-2">Create one to get started!</p>
                        </div>
                    )}
                </div>
            </div>

            <button
                onClick={() => setMenuView('main')}
                className="mt-8 mx-auto flex items-center gap-3 text-slate-500 hover:text-white transition-all hover:scale-105 px-6 py-3 rounded-full hover:bg-slate-800"
            >
                <LogOut size={20} /> <span className="font-bold tracking-wide">{t.back || "RETURN TO MENU"}</span>
            </button>

            {/* Password Modal */}
            {selectedRoom && (
                <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 backdrop-blur-md animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl max-w-md w-full shadow-2xl shadow-black/50">
                        <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-white">
                            <div className="p-2 bg-red-900/30 rounded-lg text-red-400"><Lock size={24} /></div>
                            {t.passwordRequired || "Password Required"}
                        </h3>
                        <p className="text-slate-400 mb-6">This room is private. Please enter the password to join.</p>
                        <input
                            type="password"
                            value={joinPassword}
                            onChange={(e) => setJoinPassword(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-white mb-8 focus:outline-none focus:border-purple-500 transition-colors"
                            placeholder="Enter room password"
                            autoFocus
                        />
                        <div className="flex gap-4">
                            <button
                                onClick={() => setSelectedRoom(null)}
                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
                            >
                                {t.cancel}
                            </button>
                            <button
                                onClick={submitJoinPrivate}
                                className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-purple-900/30"
                            >
                                {t.join}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderQuickMatch = () => (
        <div className="max-w-3xl mx-auto w-full px-6 animate-fade-in flex flex-col items-center justify-center min-h-[600px]">
            <div className="text-center mb-12">
                <Zap size={64} className="mx-auto mb-6 text-blue-400 animate-pulse" />
                <h2 className="text-4xl font-black text-white mb-4">{t.quickMatch}</h2>
                <p className="text-slate-400 text-lg max-w-xl mx-auto">
                    {t.quickMatchSubtitle || "Find the perfect game instantly. Customize your preferences below."}
                </p>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 w-full shadow-2xl mb-8 relative overflow-hidden">

                {/* Searching Overlay */}


                <div className="grid md:grid-cols-3 gap-6">
                    {/* Time Preference */}
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">{t.timeControl || "Time"}</label>
                        <div className="relative">
                            <select
                                value={quickTime}
                                onChange={(e) => setQuickTime(e.target.value)}
                                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3 px-4 text-white appearance-none focus:outline-none focus:border-blue-500 cursor-pointer"
                            >
                                <option value="any">Any Time</option>
                                <option value="5">5 Minutes</option>
                                <option value="10">10 Minutes</option>
                                <option value="20">20 Minutes</option>
                                <option value="30">30 Minutes</option>
                                <option value="40">40 Minutes</option>
                                <option value="50">50 Minutes</option>
                                <option value="60">60 Minutes</option>
                            </select>
                            <Activity className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                        </div>
                    </div>

                    {/* Team Size Preference */}
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">
                            {t.teamSize || "Team Size"}
                        </label>
                        <div className="relative">
                            <select
                                value={party ? party.members.length.toString() : quickTeamSize}
                                onChange={(e) => setQuickTeamSize(e.target.value)}
                                disabled={!!party}
                                className={`w-full bg-slate-950/50 border rounded-xl py-3 px-4 text-white appearance-none focus:outline-none focus:border-blue-500 cursor-pointer
                                   ${party ? 'border-indigo-500/50 text-indigo-200 cursor-not-allowed' : 'border-slate-700'}
                                `}
                            >
                                <option value="any">Any Size</option>
                                <option value="1">1 vs 1</option>
                                <option value="2">2 vs 2</option>
                                <option value="3">3 vs 3</option>
                                <option value="4">4 vs 4</option>
                            </select>
                            {party ? <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400" size={16} /> : <Users className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />}
                        </div>
                    </div>

                    {/* Language Preference */}
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">
                            {t.language || "Language"}
                        </label>
                        <div className="relative">
                            <select
                                value={party ? 'any' : quickLanguage}
                                onChange={(e) => setQuickLanguage(e.target.value)}
                                disabled={!!party}
                                className={`w-full bg-slate-950/50 border rounded-xl py-3 px-4 text-white appearance-none focus:outline-none focus:border-blue-500 cursor-pointer
                                   ${party ? 'border-indigo-500/50 text-indigo-200 cursor-not-allowed' : 'border-slate-700'}
                                `}
                            >
                                <option value="any">Any Language</option>
                                <option value="en">English</option>
                                <option value="es">Español</option>
                            </select>
                            {party ? <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400" size={16} /> : <Globe className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-4 w-full max-w-md">
                <button
                    onClick={() => setMenuView('main')}
                    className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                >
                    {t.back}
                </button>
                <button
                    onClick={() => {
                        // Check if Guest
                        if (!user) {
                            alert("Matchmaking (Ranked) is only available for registered users. Please Log In or Sign Up to play Ranked.");
                            return;
                        }

                        // Server-side matchmaking
                        console.log('Sending findMatch event', { username, socketId: socket?.id });
                        if (socket) {
                            // If party, use Party Logic constraints
                            const searchSettings = party ? {
                                time: quickTime,
                                teamSize: party.members.length.toString(),
                                language: 'any'
                            } : {
                                time: quickTime,
                                teamSize: quickTeamSize,
                                language: quickLanguage
                            };

                            socket.emit('findMatch', searchSettings);
                            setSearchStatus('searching');
                        } else {
                            console.error('Socket is not connected');
                        }
                    }}
                    disabled={party && party.leaderId !== socket?.id}
                    className={`
                        relative px-12 py-5 rounded-2xl font-black text-xl tracking-wide shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3
                        ${party && party.leaderId !== socket?.id
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : searchStatus === 'searching'
                                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/40' // Stop Search
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40' // Start Search
                        }
                    `}
                >
                    {party && party.leaderId !== socket?.id ? (
                        <>
                            <Lock size={24} />
                            {t.waitingForLeader || "WAITING FOR LEADER"}
                        </>
                    ) : searchStatus === 'searching' ? (
                        <>
                            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                            {t.cancelSearch || "CANCEL SEARCH"}
                        </>
                    ) : (
                        <>
                            <Zap size={24} fill="currentColor" />
                            {t.findMatch || "FIND MATCH"}
                        </>
                    )}
                </button>
            </div>
        </div>

    );

    return (
        <div className="min-h-screen bg-slate-900 text-white overflow-y-auto font-sans">
            {showContact && <ContactModal onClose={() => setShowContact(false)} language={language} />}
            {showAuth && (
                <AuthModal
                    onClose={() => setShowAuth(false)}
                    language={language}
                    initialView={authView}
                    onPlayAsGuest={handleGuestLogin}
                />
            )}

            {/* Navbar */}
            <nav className="absolute top-0 w-full p-6 flex justify-between items-center z-50">
                <div className="flex items-center gap-2 font-black text-xl tracking-tighter">
                    <Crown className="text-blue-500" fill="currentColor" />
                    <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">ROYAL TEAM CHESS</span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowContact(true)}
                        className="hidden md:flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider"
                    >
                        <Mail size={16} />
                        {t.contact || "CONTACT"}
                    </button>
                    <button
                        onClick={toggleLanguage}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 rounded-full border border-slate-700 transition-colors text-xs font-bold text-slate-300 hover:text-white backdrop-blur-sm"
                    >
                        <Globe size={14} />
                        {language === 'en' ? 'ES' : 'EN'}
                    </button>
                    {user ? (
                        <div className="flex items-center gap-4">
                            <span className="text-blue-400 font-bold">{user.user_metadata?.username}</span>
                            <button onClick={signOut} className="text-slate-500 hover:text-white">
                                <LogOut size={20} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => openAuth('login')}
                            className="px-6 py-2 bg-white text-slate-900 rounded-full font-bold hover:bg-blue-50 transition-colors shadow-lg shadow-blue-900/20"
                        >
                            {t.login || "LOGIN"}
                        </button>
                    )}
                </div>
            </nav>

            {/* Main Content Container */}
            <div className="relative">

                {/* LANDING PAGE VIEW */}
                {menuView === 'landing' && (
                    <>
                        {/* Hero Section */}
                        <header className="relative py-24 px-6 text-center overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900 z-0 pointer-events-none" />
                            <div className="relative z-10 max-w-5xl mx-auto">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-300 text-xs font-bold mb-8 uppercase tracking-widest animate-fade-in-up">
                                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                                    {t.betaAccess || "Public Beta Live"}
                                </div>
                                <h1 className="text-5xl md:text-8xl font-black mb-8 tracking-tight leading-tight">
                                    <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                                        {t.heroTitle1 || "Chess is now a"}
                                    </span>
                                    <br />
                                    <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent drop-shadow-2xl">
                                        {t.heroTitle2 || "Team Sport."}
                                    </span>
                                </h1>
                                <p className="text-xl md:text-2xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
                                    {t.heroSubtitle || "Coordinate with a shared clock. Analyze real-time data. Dominate the board together without seeing your partner's moves."}
                                </p>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                                    <button
                                        onClick={handlePlayNow}
                                        className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl font-bold text-xl transition-all transform hover:scale-105 shadow-2xl shadow-blue-900/50 flex items-center justify-center gap-3 border border-blue-400/20"
                                    >
                                        <Play size={24} fill="currentColor" /> {t.playNow || "PLAY NOW"}
                                    </button>

                                    {!user && (
                                        <button
                                            onClick={() => openAuth('register')}
                                            className="w-full sm:w-auto px-10 py-5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl font-bold text-xl transition-all flex items-center justify-center gap-3 backdrop-blur-sm"
                                        >
                                            <UserPlus size={24} /> {t.register || 'Sign Up'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </header>

                        {/* Core Features Grid */}
                        <section className="py-20 px-6 bg-slate-800/30 border-y border-slate-800/50">
                            <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
                                {/* Feature 1 */}
                                <div className="group bg-slate-900/50 p-8 rounded-2xl border border-slate-700/50 hover:border-blue-500/50 transition-all hover:bg-slate-900/80 hover:shadow-xl hover:shadow-blue-900/10">
                                    <div className="w-14 h-14 bg-blue-900/20 rounded-xl flex items-center justify-center mb-6 text-blue-400 group-hover:scale-110 transition-transform">
                                        <Users size={32} />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-3 text-white">{t.teamClock || "Shared Team Clock"}</h3>
                                    <p className="text-slate-400 leading-relaxed">
                                        {t.teamClockDesc || "Time is your most valuable resource. You and your teammate share a single timer. Move fast to save time for your partner's critical moments."}
                                    </p>
                                </div>

                                {/* Feature 2 */}
                                <div className="group bg-slate-900/50 p-8 rounded-2xl border border-slate-700/50 hover:border-purple-500/50 transition-all hover:bg-slate-900/80 hover:shadow-xl hover:shadow-purple-900/10">
                                    <div className="w-14 h-14 bg-purple-900/20 rounded-xl flex items-center justify-center mb-6 text-purple-400 group-hover:scale-110 transition-transform">
                                        <Activity size={32} />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-3 text-white">{t.visualizers || "Data Visualizers"}</h3>
                                    <p className="text-slate-400 leading-relaxed">
                                        {t.visualizerDesc || "You can't see your partner's board, but you can see their war. Use Heatmaps, Thermometers, and Burn Rates to understand the flow of battle."}
                                    </p>
                                </div>

                                {/* Feature 3 */}
                                <div className="group bg-slate-900/50 p-8 rounded-2xl border border-slate-700/50 hover:border-green-500/50 transition-all hover:bg-slate-900/80 hover:shadow-xl hover:shadow-green-900/10">
                                    <div className="w-14 h-14 bg-green-900/20 rounded-xl flex items-center justify-center mb-6 text-green-400 group-hover:scale-110 transition-transform">
                                        <MessageSquare size={32} />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-3 text-white">{t.communication || "Strategic Comms"}</h3>
                                    <p className="text-slate-400 leading-relaxed">
                                        {t.commDesc || "Communication is key, but spoilers are forbidden. Discuss strategy and timing, but never reveal specific moves. Trust your teammate to execute the plan."}
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Deep Dive: How to Play */}
                        <section className="py-24 px-6">
                            <div className="max-w-5xl mx-auto">
                                <div className="text-center mb-16">
                                    <h2 className="text-4xl md:text-5xl font-black mb-6">{t.howToPlay || "Master the Interface"}</h2>
                                    <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                                        {t.howToPlaySubtitle || "Understanding the visualizers is the difference between victory and defeat."}
                                    </p>
                                </div>

                                <div className="grid gap-12">
                                    {/* Thermometer */}
                                    <div className="flex flex-col md:flex-row gap-8 items-center bg-slate-800/20 p-8 rounded-3xl border border-slate-700/50">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="p-2 bg-red-900/30 rounded-lg text-red-400"><Thermometer size={24} /></div>
                                                <h3 className="text-2xl font-bold text-white">{t.thermometer || "The Thermometer"}</h3>
                                            </div>
                                            <p className="text-slate-300 text-lg leading-relaxed mb-4">
                                                {t.thermoExplain || "The classic advantage meter. It shows who is winning based on material and positional analysis."}
                                            </p>
                                            <ul className="space-y-2 text-slate-400">
                                                <li className="flex items-center gap-2"><div className="w-2 h-2 bg-white rounded-full"></div> {t.thermoWhite || "White Bar = White Control"}</li>
                                                <li className="flex items-center gap-2"><div className="w-2 h-2 bg-slate-500 rounded-full"></div> {t.thermoBlack || "Black Bar = Black Control"}</li>
                                            </ul>
                                        </div>
                                        <div className="flex-1 flex justify-center">
                                            <div className="w-16 h-64 bg-slate-800 rounded-full border-4 border-slate-700 relative overflow-hidden shadow-2xl">
                                                <div className="absolute bottom-0 w-full h-[60%] bg-white transition-all duration-1000"></div>
                                                <div className="absolute top-0 w-full h-[40%] bg-slate-900"></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Heatmap */}
                                    <div className="flex flex-col md:flex-row-reverse gap-8 items-center bg-slate-800/20 p-8 rounded-3xl border border-slate-700/50">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="p-2 bg-blue-900/30 rounded-lg text-blue-400"><Activity size={24} /></div>
                                                <h3 className="text-2xl font-bold text-white">{t.heatmap || "The Heatmap"}</h3>
                                            </div>
                                            <p className="text-slate-300 text-lg leading-relaxed mb-4">
                                                {t.heatmapExplain || "See board control at a glance. Each square's color tells you who owns that territory."}
                                            </p>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div className="flex items-center gap-2 text-blue-300"><span className="w-3 h-3 bg-blue-500 rounded"></span> {t.whiteControl || "White Control"}</div>
                                                <div className="flex items-center gap-2 text-red-300"><span className="w-3 h-3 bg-red-500 rounded"></span> {t.blackControl || "Black Control"}</div>
                                                <div className="flex items-center gap-2 text-yellow-300"><span className="w-3 h-3 bg-yellow-500 rounded"></span> {t.contestedTie || "Contested (Tie)"}</div>
                                                <div className="flex items-center gap-2 text-purple-300"><span className="w-3 h-3 bg-purple-500 rounded"></span> {t.complexBattle || "Complex Battle"}</div>
                                            </div>
                                        </div>
                                        <div className="flex-1 flex justify-center">
                                            <div className="grid grid-cols-4 gap-1 p-2 bg-slate-800 rounded-lg shadow-2xl">
                                                {[...Array(16)].map((_, i) => (
                                                    <div key={i} className={`w-10 h-10 rounded ${i === 0 ? 'bg-blue-500' : i === 5 ? 'bg-red-500' : i === 10 ? 'bg-yellow-500' : i === 15 ? 'bg-purple-500' : 'bg-slate-700/30'
                                                        }`}></div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Burn Rate & King Safety */}
                                    <div className="grid md:grid-cols-2 gap-8">
                                        <div className="bg-slate-800/20 p-8 rounded-3xl border border-slate-700/50">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="p-2 bg-orange-900/30 rounded-lg text-orange-400"><Flame size={24} /></div>
                                                <h3 className="text-xl font-bold text-white">{t.burnRate || "Time Burn"}</h3>
                                            </div>
                                            <p className="text-slate-400 mb-4">
                                                {t.burnExplain || "Tracks time usage intensity. If the flame turns RED, your teammate is burning time faster than the team average. Tell them to hurry up!"}
                                            </p>
                                        </div>
                                        <div className="bg-slate-800/20 p-8 rounded-3xl border border-slate-700/50">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="p-2 bg-green-900/30 rounded-lg text-green-400"><Shield size={24} /></div>
                                                <h3 className="text-xl font-bold text-white">{t.kingSafety || "King Safety"}</h3>
                                            </div>
                                            <ul className="space-y-3 text-sm text-slate-300">
                                                <li className="flex items-center gap-3"><Shield size={16} className="text-green-500" /> {t.kingSafe || "Safe"}</li>
                                                <li className="flex items-center gap-3"><Shield size={16} className="text-green-500 drop-shadow-[0_0_3px_rgba(239,68,68,0.8)]" /> {t.kingSurrounded || "Safe but Surrounded"}</li>
                                                <li className="flex items-center gap-3"><Shield size={16} className="text-orange-500" /> {t.kingUnsafe || "Unsafe / Exposed"}</li>
                                                <li className="flex items-center gap-3"><Shield size={16} className="text-red-500 animate-pulse" /> {t.kingDanger || "Under Attack / Check"}</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Future Roadmap */}
                        <section className="py-24 px-6 bg-gradient-to-b from-slate-900 to-blue-900/20 border-t border-slate-800">
                            <div className="max-w-6xl mx-auto text-center">
                                <h2 className="text-3xl md:text-4xl font-black mb-12 flex items-center justify-center gap-3">
                                    <Target className="text-blue-500" /> {t.roadmapTitle || "The Future of Royal Team Chess"}
                                </h2>

                                <div className="grid md:grid-cols-3 gap-6 text-left">
                                    {/* Match Mode */}
                                    <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-700/50 hover:border-blue-500/50 transition-all hover:bg-slate-900/90 group">
                                        <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-lg">
                                            <Trophy size={20} className="text-yellow-400 group-hover:scale-110 transition-transform" />
                                            {t.matchModeTitle || "The 'Match' Mode"}
                                        </h4>
                                        <p className="text-slate-400 text-sm leading-relaxed">
                                            {t.matchModeDesc || "The ultimate competitive experience. 4vs4 battles, 2 halves, substitutions, and bench strategy."}
                                        </p>
                                    </div>

                                    {/* Esports */}
                                    <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-700/50 hover:border-yellow-500/30 transition-colors">
                                        <h4 className="font-bold text-white mb-2 flex items-center gap-2"><Trophy size={18} className="text-yellow-400" /> {t.esportsTitle || "Esports Revolution"}</h4>
                                        <p className="text-slate-400 text-sm">{t.esportsDesc || "Professional leagues played on weekends, live broadcasts, and a complete Esports ecosystem."}</p>
                                    </div>

                                    {/* Tournaments */}
                                    <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-700/50 hover:border-orange-500/30 transition-colors">
                                        <h4 className="font-bold text-white mb-2 flex items-center gap-2"><Crown size={18} className="text-orange-400" /> {t.tournamentsTitle || "Official Tournaments"}</h4>
                                        <p className="text-slate-400 text-sm">{t.tournamentsDesc || "Regular official tournaments with real prizes, open to all skill levels."}</p>
                                    </div>

                                    {/* Game Modes */}
                                    <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-700/50 hover:border-purple-500/30 transition-colors">
                                        <h4 className="font-bold text-white mb-2 flex items-center gap-2"><Zap size={18} className="text-purple-400" /> {t.gameModesTitle || "New Game Modes"}</h4>
                                        <p className="text-slate-400 text-sm">{t.gameModesDesc || "Single Game, Match Mode, Knockout, Tournament, and League. Official or community-created."}</p>
                                    </div>

                                    {/* Clubs */}
                                    <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-700/50 hover:border-blue-500/30 transition-colors">
                                        <h4 className="font-bold text-white mb-2 flex items-center gap-2"><Users size={18} className="text-blue-400" /> {t.clubsTitle || "Clubs & Teams"}</h4>
                                        <p className="text-slate-400 text-sm">{t.clubsDesc || "Create permanent teams, manage rosters, and climb the global team rankings."}</p>
                                    </div>

                                    {/* Community */}
                                    <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-700/50 hover:border-green-500/30 transition-colors">
                                        <h4 className="font-bold text-white mb-2 flex items-center gap-2"><Globe size={18} className="text-green-400" /> {t.communityTitle || "Global Community"}</h4>
                                        <p className="text-slate-400 text-sm">{t.communityDesc || "Localized events, community-driven features, and international leaderboards."}</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Final CTA */}
                        <section className="py-24 px-6 text-center">
                            <div className="max-w-3xl mx-auto">
                                <h2 className="text-4xl md:text-5xl font-black mb-8 text-white">
                                    {t.joinRevolution || "Ready to join the revolution?"}
                                </h2>
                                <button
                                    onClick={handlePlayNow}
                                    className="px-12 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-2xl font-black text-2xl transition-all transform hover:scale-105 shadow-2xl shadow-blue-900/50 flex items-center justify-center gap-4 mx-auto"
                                >
                                    <Play size={32} fill="currentColor" /> {t.playNowCaps || "PLAY NOW - IT'S FREE"}
                                </button>
                            </div>
                        </section>
                    </>
                )}

                {/* MENU VIEWS */}
                <div className="relative z-10 flex-1 flex flex-col justify-center min-h-[600px]">
                    {menuView === 'main' && renderMainMenu()}
                    {menuView === 'play_modes' && renderPlayMenu()}
                    {menuView === 'create' && renderCreateServer()}
                    {menuView === 'browser' && renderBrowser()}
                    {menuView === 'quick' && renderQuickMatch()}
                </div>
            </div>

            {/* Footer */}
            <footer className="py-8 border-t border-slate-800 text-center text-slate-500 text-sm bg-slate-950 relative z-10">
                <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
                    <Crown size={20} />
                    <span className="font-bold">Royal Team Chess</span>
                </div>
                <p>&copy; 2025 Royal Team Chess. All rights reserved.</p>
            </footer>
            {/* Full Screen Searching Overlay */}
            {searchStatus === 'searching' && (
                <div className="fixed inset-0 bg-slate-950/95 z-[100] flex flex-col items-center justify-center animate-fade-in backdrop-blur-sm">
                    <div className="w-24 h-24 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-8 shadow-lg shadow-blue-500/20"></div>
                    <h3 className="text-4xl font-black text-white mb-3 tracking-tight">Searching for Match...</h3>
                    <p className="text-slate-400 mb-10 text-xl font-medium">Looking for a worthy opponent</p>
                    <button
                        onClick={() => {
                            if (socket) socket.emit('cancelMatchmaking');
                            setSearchStatus('idle');
                        }}
                        className="px-10 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500/60 rounded-xl font-bold transition-all hover:scale-105"
                    >
                        Cancel Search
                    </button>
                </div>
            )}
        </div>
    );
}
