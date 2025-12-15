import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Trophy, Shield, Calendar, BarChart2, UserPlus, MessageSquare, Settings, Trash2, AlertTriangle, XCircle } from 'lucide-react';
import { translations } from '../translations';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { ClubStatistics } from './ClubStatistics';
import { ClubChat } from './ClubChat';
import TrophyList from './TrophyList';

export function ClubProfile({ language, socket }) {
    const { clubId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const t = translations[language];

    const [club, setClub] = useState(null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isMember, setIsMember] = useState(false);
    const [isOwner, setIsOwner] = useState(false);

    // UI States
    // const [showStats, setShowStats] = useState(false); // Removed

    const [activeTab, setActiveTab] = useState('members');
    const [requests, setRequests] = useState([]);
    const [leagueStats, setLeagueStats] = useState(null); // { division, points, rank }

    // Modals
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [joinMsg, setJoinMsg] = useState('');

    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteUsername, setInviteUsername] = useState('');

    const [showSettingsModal, setShowSettingsModal] = useState(false);

    const [deleteConfirm, setDeleteConfirm] = useState(false);

    // Invite Autocomplete State
    const [inviteSuggestions, setInviteSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Kick Mode
    const [isKickMode, setIsKickMode] = useState(false);

    useEffect(() => {
        fetchClubData();
    }, [clubId]);

    const fetchClubData = async () => {
        setLoading(true);
        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const serverUrl = isLocal ? 'http://localhost:3000' : (import.meta.env.VITE_SERVER_URL || 'http://localhost:3000');

            // 1. Get Club Details
            const resClub = await fetch(`${serverUrl}/api/clubs/${clubId}`);
            if (!resClub.ok) throw new Error('Club not found');
            const clubData = await resClub.json();
            setClub(clubData);

            // 2. Get Members (Should be included in endpoint? Assuming separate or included)
            // The `api/clubs/:id` I implemented returns { ...club, owner, members: [...] }?
            // Let's check db.js `getClub`. It does a join.
            // Wait, db.js `getClub` selects `*, owner:profiles!owner_id(*)` but NOT members.
            // I implemented `getClubMembers(clubId)` in db.js separately.
            // And API `GET /api/clubs/:id` usually returns just the club unless I updated it.
            // Let's assume I need to fetch members separately if not included.
            // Actually, I should check the API response structure. 
            // For now, I'll assume I need to fetch members via Supabase directly or another endpoint?
            // Oops, I didn't create `/api/clubs/:id/members`.
            // But I can fetch from Suapbase directly here since it's a GET.

            const { data: memberData, error: membError } = await supabase
                .from('club_members')
                .select(`
                    role,
                    joined_at,
                    season_points:season_points_contribution,
                    user:profiles!user_id (id, username, avatar_url, elo)
                `)
                .eq('club_id', clubId);

            if (membError) throw membError;
            if (membError) throw membError;
            setMembers(memberData);

            // 3. Get League Stats (Current Season)
            const now = new Date();
            const currentSeasonId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const { data: statsData } = await supabase
                .from('club_seasonal_stats')
                .select('*')
                .eq('club_id', clubId)
                .eq('season_id', currentSeasonId)
                .maybeSingle();

            if (statsData) {
                // To get Rank, we arguably check ELO or Points among all clubs in same division?
                // For a snapshot, simple stats are enough. 
                // Rank calculation is heavy on client if we don't have a view. 
                // Let's just show Points and Division.
                setLeagueStats({
                    division: clubData.division || 1, // Use club's master division or snapshot
                    points: statsData.season_points || 0,
                    wins: statsData.matches_won || 0,
                    draws: statsData.matches_drawn || 0,
                    losses: statsData.matches_lost || 0
                });
            } else {
                setLeagueStats({
                    division: clubData.division || 1,
                    points: 0,
                    wins: 0,
                    draws: 0,
                    losses: 0
                });
            }

            // Check My Status
            if (user) {
                const me = memberData.find(m => m.user.id === user.id);
                setIsMember(!!me);
                setIsOwner(clubData.owner_id === user.id);
            }

        } catch (err) {
            console.error('Fetch Club Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRequest = async () => {
        if (!user) return;
        if (!joinMsg) return;
        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const serverUrl = isLocal ? 'http://localhost:3000' : (import.meta.env.VITE_SERVER_URL || 'http://localhost:3000');
            const res = await fetch(`${serverUrl}/api/clubs/join-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clubId,
                    userId: user.id,
                    message: joinMsg
                })
            });
            const data = await res.json();
            if (data.error) alert(data.error);
            else {
                alert('Request sent!');
                setShowJoinModal(false);
                setJoinMsg('');
            }
        } catch (e) {
            alert('Error sending request: ' + e.message);
        }
    };

    const handleKickMember = async (memberUser) => {
        if (memberUser.id === user.id) return; // Cannot kick self here, though standard logic handles nav

        if (!confirm(t.kickConfirm)) return;

        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const serverUrl = isLocal ? 'http://localhost:3000' : (import.meta.env.VITE_SERVER_URL || 'http://localhost:3000');
            const res = await fetch(`${serverUrl}/api/clubs/kick`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clubId,
                    userId: memberUser.id,
                    requesterId: user.id
                })
            });
            const data = await res.json();
            if (data.error) alert(data.error);
            else {
                // Remove from list locally
                setMembers(prev => prev.filter(m => m.user.id !== memberUser.id));
                setIsKickMode(false); // Exit kick mode? Or keep it open? User might want to kick multiple. Let's keep it.
            }
        } catch (e) {
            alert('Error kicking member: ' + e.message);
        }
    };

    const handleMemberClick = (member) => {
        if (isKickMode) {
            if (member.role === 'owner') {
                alert(t.cannotKickOwner);
                return;
            }
            handleKickMember(member.user);
        } else {
            navigate(`/profile/${member.user.id}`);
        }
    };

    const handleRespondRequest = async (requestId, status) => {
        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const serverUrl = isLocal ? 'http://localhost:3000' : (import.meta.env.VITE_SERVER_URL || 'http://localhost:3000');
            const res = await fetch(`${serverUrl}/api/clubs/requests/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId,
                    status,
                    clubId,
                    userId: requests.find(r => r.id === requestId).user.id // Need user id to add member
                })
            });
            const data = await res.json();
            if (data.error) alert(data.error);
            else {
                // Refresh
                fetchRequests();
                if (status === 'accepted') fetchClubData();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleInvite = async () => {
        if (!inviteUsername) return;
        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const serverUrl = isLocal ? 'http://localhost:3000' : (import.meta.env.VITE_SERVER_URL || 'http://localhost:3000');
            const res = await fetch(`${serverUrl}/api/clubs/invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clubId,
                    targetUsername: inviteUsername,
                    senderId: user.id
                })
            });
            const data = await res.json();
            if (data.error) alert(data.error);
            else {
                alert('Invite sent!');
                setShowInviteModal(false);
                setInviteUsername('');
                setInviteSuggestions([]);
            }
        } catch (e) {
            alert('Error sending invite: ' + e.message);
        }
    };

    // Autocomplete Handler
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (inviteUsername.length < 3) {
                setInviteSuggestions([]);
                return;
            }

            try {
                const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                const serverUrl = isLocal ? 'http://localhost:3000' : (import.meta.env.VITE_SERVER_URL || 'http://localhost:3000');
                const res = await fetch(`${serverUrl}/api/users/search?q=${inviteUsername}`);
                const data = await res.json();
                setInviteSuggestions(data);
                setShowSuggestions(true);
            } catch (e) {
                console.error("Autocomplete error:", e);
            }
        };

        const timeoutId = setTimeout(fetchSuggestions, 300); // Debounce
        return () => clearTimeout(timeoutId);
    }, [inviteUsername]);

    // Fetch Requests
    const fetchRequests = async () => {
        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const serverUrl = isLocal ? 'http://localhost:3000' : (import.meta.env.VITE_SERVER_URL || 'http://localhost:3000');
            const res = await fetch(`${serverUrl}/api/clubs/${clubId}/requests`);
            const data = await res.json();
            setRequests(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteClub = async () => {
        if (!user || !isOwner) return;
        setLoading(true);
        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const serverUrl = isLocal ? 'http://localhost:3000' : (import.meta.env.VITE_SERVER_URL || 'http://localhost:3000');

            const res = await fetch(`${serverUrl}/api/clubs/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clubId,
                    userId: user.id
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            // Success
            alert('Club deleted successfully.');
            navigate('/');
        } catch (e) {
            console.error('Delete Club Error:', e);
            alert('Failed to delete club: ' + e.message);
            setLoading(false); // Only stop loading if error, otherwise we navigate away
        }
    };

    useEffect(() => {
        if (isOwner && activeTab === 'requests') {
            fetchRequests();
        }
    }, [isOwner, activeTab]);

    if (loading) return <div className="h-screen flex items-center justify-center text-white"><div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div></div>;
    if (error) return <div className="h-screen flex items-center justify-center text-red-400">{error}</div>;

    return (
        <div className="h-full overflow-y-auto bg-slate-900 text-white p-6 pt-24 custom-scrollbar">
            <div className="max-w-5xl mx-auto animate-fade-in pb-20">

                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                    <button onClick={() => navigate('/', { state: { view: 'main' } })} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} /> {t.back}
                    </button>

                    {isOwner && (
                        <button
                            onClick={() => setShowSettingsModal(true)}
                            className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400 transition-colors"
                        >
                            <Settings size={20} />
                        </button>
                    )}
                </div>

                {/* Club Banner / Info */}
                <div className="glass-panel p-8 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="flex items-center gap-8 relative z-10">
                        <div className="w-32 h-32 bg-slate-800 rounded-3xl flex items-center justify-center shadow-2xl border border-slate-700 p-2">
                            {club.logo_url ? (
                                <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                                <Shield size={64} className="text-emerald-500" />
                            )}
                        </div>

                        <div className="flex-1">
                            <h1 className="text-5xl font-black mb-2">{club.name}</h1>
                            <p className="text-slate-400 text-lg max-w-2xl">{club.description || t.noDescription}</p>

                            <div className="flex gap-6 mt-6">
                                <div className="flex items-center gap-2 text-slate-300">
                                    <Trophy size={18} className="text-amber-400" />
                                    <span className="font-bold">{club.total_trophies || 0} {t.trophies}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-300">
                                    <Users size={18} className="text-blue-400" />
                                    <span className="font-bold">{members.length} {t.members}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-300">
                                    <Calendar size={18} className="text-purple-400" />
                                    <span className="font-bold">{t.established} {new Date(club.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3">
                            {isMember ? (
                                <div className="px-6 py-2 bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 rounded-lg font-bold flex items-center gap-2">
                                    <Shield size={16} /> {t.member}
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowJoinModal(true)}
                                    className="btn-primary flex items-center gap-2 px-6"
                                >
                                    {t.requestJoin}
                                </button>
                            )}

                            {/* Stats Button Removed */}
                        </div>
                    </div>
                </div>

                {/* Trophies Section */}
                <div className="mb-8">
                    <TrophyList entityId={club.id} type="CLUB" language={language} />
                </div>

                {/* Statistics Section (Always Visible) */}
                <div className="mb-8 animate-fade-in-up">
                    <ClubStatistics clubId={clubId} language={language} />
                </div>

                {/* Content Grid */}
                <div className="grid lg:grid-cols-3 gap-8">

                    {/* Members / Requests List */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setActiveTab('members')}
                                    className={`text-xl font-bold flex items-center gap-2 ${activeTab === 'members' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <Users className={activeTab === 'members' ? "text-blue-400" : "text-slate-500"} /> {t.members}
                                </button>
                                {isOwner && (
                                    <button
                                        onClick={() => setActiveTab('requests')}
                                        className={`text-xl font-bold flex items-center gap-2 ${activeTab === 'requests' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        <UserPlus className={activeTab === 'requests' ? "text-orange-400" : "text-slate-500"} /> {t.requests}
                                        {requests.length > 0 && <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{requests.length}</span>}
                                    </button>
                                )}
                            </div>

                            {activeTab === 'members' && isOwner && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowInviteModal(true)}
                                        className="text-sm bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded-lg font-bold transition-colors"
                                    >
                                        + {t.invite}
                                    </button>
                                    <button
                                        onClick={() => setIsKickMode(!isKickMode)}
                                        className={`text-sm px-3 py-1 rounded-lg font-bold transition-colors ${isKickMode
                                            ? 'bg-red-600 hover:bg-red-500 text-white'
                                            : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                            }`}
                                    >
                                        {isKickMode ? t.cancel : t.kick}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl overflow-hidden min-h-[300px]">
                            {activeTab === 'members' && members.map((m, i) => (
                                <div
                                    key={m.user.id}
                                    onClick={() => handleMemberClick(m)}
                                    className={`flex items-center gap-4 p-4 transition-colors border-b border-slate-800 last:border-0 cursor-pointer ${isKickMode
                                        ? 'hover:bg-red-900/20 hover:border-red-900/50'
                                        : 'hover:bg-slate-800/50'
                                        }`}
                                >
                                    <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center overflow-hidden">
                                        {m.user.avatar_url ? (
                                            <img src={m.user.avatar_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="font-bold text-slate-500">{m.user.username.substring(0, 2).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold flex items-center gap-2">
                                            {m.user.username}
                                            {m.role === 'owner' && <Crown size={14} className="text-amber-400" />}
                                            {m.role === 'admin' && <Shield size={14} className="text-slate-400" />}
                                            {isKickMode && m.role !== 'owner' && (
                                                <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded ml-2 animate-pulse">{t.kickCaps}</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500">ELO: {m.user.elo}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-mono font-bold text-emerald-400">{m.season_points || 0} pts</div>
                                        <div className="text-xs text-slate-500">{t.season}</div>
                                    </div>
                                </div>
                            ))}

                            {activeTab === 'requests' && requests.length === 0 && (
                                <div className="p-8 text-center text-slate-500 italic">{t.noPendingRequests}</div>
                            )}

                            {activeTab === 'requests' && requests.map(r => (
                                <div key={r.id} className="flex items-center gap-4 p-4 hover:bg-slate-800/50 transition-colors border-b border-slate-800 last:border-0">
                                    <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center overflow-hidden">
                                        <span className="font-bold text-slate-500">{r.user.username.substring(0, 2).toUpperCase()}</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-white">{r.user.username} <span className="text-xs text-yellow-500 ml-2">({r.user.elo})</span></div>
                                        <div className="text-sm text-slate-400">"{r.message}"</div>
                                        <div className="text-xs text-slate-500 mt-1">{new Date(r.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleRespondRequest(r.id, 'rejected')}
                                            className="p-2 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                                            title={t.decline}
                                        >
                                            {t.decline}
                                        </button>
                                        <button
                                            onClick={() => handleRespondRequest(r.id, 'accepted')}
                                            className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-bold"
                                            title={t.accept}
                                        >
                                            {t.accept}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar: Chat / Activity */}
                    <div className="space-y-6">
                        {/* League Snapshot */}
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden group hover:border-amber-500/60 transition-colors cursor-pointer" onClick={() => navigate('/ranking-leagues')}>
                            <div className="absolute top-0 right-0 p-16 bg-amber-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>

                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white relative z-10">
                                <Trophy className="text-amber-500" size={20} /> League Status
                            </h3>

                            <div className="relative z-10">
                                <div className="text-sm text-slate-400 font-bold uppercase tracking-wider mb-1">{t.division}</div>
                                <div className="text-3xl font-black text-white mb-4">
                                    {leagueStats?.division === 1 ? `${t.divisionName} 1` : `${t.divisionName} ${leagueStats?.division}`}
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-700/50">
                                        <div className="text-xs text-slate-500 uppercase font-bold">{t.points}</div>
                                        <div className="text-xl font-black text-blue-400">{leagueStats?.points || 0}</div>
                                    </div>
                                    <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-700/50">
                                        <div className="text-xs text-slate-500 uppercase font-bold">{t.record}</div>
                                        <div className="text-xl font-bold text-white flex gap-1">
                                            <span className="text-emerald-400">{leagueStats?.wins || 0}</span>-
                                            <span className="text-slate-400">{leagueStats?.draws || 0}</span>-
                                            <span className="text-red-400">{leagueStats?.losses || 0}</span>
                                        </div>
                                    </div>
                                </div>

                                <button className="w-full py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 rounded-lg font-bold text-sm transition-colors border border-amber-500/20">
                                    {t.viewFullTable}
                                </button>
                            </div>
                        </div>

                        {/* Chat */}
                        {isMember ? (
                            <ClubChat clubId={clubId} user={user} language={language} />
                        ) : (
                            <div className="bg-slate-800/20 border border-slate-700/50 rounded-2xl p-6 h-fit text-center">
                                <h3 className="text-lg font-bold mb-4 flex items-center justify-center gap-2">
                                    <MessageSquare className="text-slate-500" /> {t.clubChat}
                                </h3>
                                <p className="text-slate-400 text-sm italic py-8 border border-dashed border-slate-700 rounded-xl">
                                    {t.joinToChat}
                                </p>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Join Request Modal */}
            {
                showJoinModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                        <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-md w-full animate-scale-in">
                            <h3 className="text-2xl font-bold mb-4">{t.join} {club.name}</h3>
                            <textarea
                                value={joinMsg}
                                onChange={e => setJoinMsg(e.target.value)}
                                className="w-full bg-slate-950 p-4 rounded-xl border border-slate-700 text-white mb-4 focus:border-emerald-500 outline-none"
                                placeholder={t.joinRequestPlaceholder}
                                rows={4}
                            />
                            <div className="flex gap-3">
                                <button onClick={() => setShowJoinModal(false)} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold hover:bg-slate-700">{t.cancel}</button>
                                <button onClick={handleJoinRequest} className="flex-1 py-3 bg-emerald-600 rounded-xl font-bold hover:bg-emerald-500">{t.sendRequest}</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Invite Modal */}
            {
                showInviteModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                        <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-md w-full animate-scale-in relative">
                            <button
                                onClick={() => { setShowInviteModal(false); setInviteUsername(''); setInviteSuggestions([]); }}
                                className="absolute top-4 right-4 text-slate-500 hover:text-white"
                            >
                                <XCircle size={24} />
                            </button>
                            <h3 className="text-2xl font-bold mb-4">{t.inviteTo} {club.name}</h3>
                            <p className="text-slate-400 text-sm mb-4">{t.inviteUpdated}</p>

                            <div className="relative mb-6">
                                <input
                                    type="text"
                                    value={inviteUsername}
                                    onChange={e => {
                                        setInviteUsername(e.target.value);
                                        setShowSuggestions(true);
                                    }}
                                    className="w-full bg-slate-950 p-4 rounded-xl border border-slate-700 text-white focus:border-blue-500 outline-none"
                                    placeholder={t.usernamePlaceholder}
                                />
                                {/* Suggestions List */}
                                {showSuggestions && inviteSuggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl max-h-48 overflow-y-auto z-10 shadow-xl">
                                        {inviteSuggestions.map(u => (
                                            <div
                                                key={u.id}
                                                className="p-3 hover:bg-slate-700 cursor-pointer flex items-center gap-3 transition-colors"
                                                onClick={() => {
                                                    setInviteUsername(u.username);
                                                    setShowSuggestions(false);
                                                }}
                                            >
                                                <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center font-bold text-xs text-white overflow-hidden">
                                                    {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : u.username.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-white">{u.username}</div>
                                                    <div className="text-xs text-slate-400">ELO: {u.elo}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => { setShowInviteModal(false); setInviteUsername(''); }} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold hover:bg-slate-700">{t.cancel}</button>
                                <button onClick={handleInvite} className="flex-1 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500">{t.sendInvite}</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Settings Modal */}
            {
                showSettingsModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                        <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-md w-full animate-scale-in relative">
                            <button
                                onClick={() => { setShowSettingsModal(false); setDeleteConfirm(false); }}
                                className="absolute top-4 right-4 text-slate-500 hover:text-white"
                            >
                                <XCircle size={24} />
                            </button>

                            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                <Settings className="text-slate-400" /> {t.clubSettings}
                            </h3>

                            {!deleteConfirm ? (
                                <div className="space-y-4">
                                    <button
                                        onClick={() => setDeleteConfirm(true)}
                                        className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={20} /> {t.deleteClub}
                                    </button>
                                    <p className="text-slate-500 text-sm text-center">
                                        {t.deleteClubWarning}
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center space-y-4 animate-fade-in">
                                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-500 mb-2">
                                        <AlertTriangle size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">{t.areYouSure}</h3>
                                    <p className="text-slate-400 text-sm">
                                        {t.deleteClubConfirm}
                                    </p>

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            onClick={() => setDeleteConfirm(false)}
                                            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                                        >
                                            {t.cancel}
                                        </button>
                                        <button
                                            onClick={handleDeleteClub}
                                            className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-900/30"
                                        >
                                            {t.deleteIt}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
        </div >
    );
}

// Simple Icon Component (local usage)
function Crown({ size, className }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m2 4 3 12h14l3-12-6 7-4-3-4 3-6-7z" /><circle cx="12" cy="7" r="3" /></svg>
}
