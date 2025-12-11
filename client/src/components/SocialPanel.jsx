import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Shield, MessageSquare, UserPlus, Check } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export function SocialPanel({ language, onOpenChat, onInvite, socket }) {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('friends'); // 'friends' or 'team'
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    const [userStatuses, setUserStatuses] = useState({}); // userId -> status
    const [inviteStatus, setInviteStatus] = useState({}); // userId -> 'sent' | null

    useEffect(() => {
        fetchUsers();

        const handleFriendUpdate = () => fetchUsers();
        window.addEventListener('friend-updated', handleFriendUpdate);

        // Listen for real-time status updates from server
        if (socket) {


            const handleStatusUpdate = ({ userId, status }) => {
                setUserStatuses(prev => ({
                    ...prev,
                    [userId]: status
                }));
            };

            const handleInitialStatuses = (statuses) => {
                setUserStatuses(prev => ({
                    ...prev,
                    ...statuses
                }));
            };

            socket.on('userStatusUpdate', handleStatusUpdate);
            socket.on('initialUserStatuses', handleInitialStatuses); // Listen for snapshot

            return () => {
                window.removeEventListener('friend-updated', handleFriendUpdate);
                socket.off('userStatusUpdate', handleStatusUpdate);
                socket.off('initialUserStatuses', handleInitialStatuses);
            };
        }

        return () => {
            window.removeEventListener('friend-updated', handleFriendUpdate);
        };
    }, [activeTab, socket]);

    const fetchUsers = async () => {
        if (!currentUser) {
            console.log('[SocialPanel] No currentUser, skipping fetch');
            return;
        }

        console.log('[SocialPanel] Fetching for tab:', activeTab, 'User:', currentUser.id);
        setLoading(true);
        try {
            if (activeTab === 'friends') {
                const { data: friendsData, error: friendsError } = await supabase
                    .from('friends')
                    .select('friend_id')
                    .eq('user_id', currentUser.id);

                if (friendsError) {
                    console.error('[SocialPanel] Friends Query Error:', friendsError);
                    alert('Error fetching friends: ' + friendsError.message); // Visible alert
                }
                console.log('[SocialPanel DEBUG_V2] Friends DB Relations:', friendsData?.length, friendsData);
                console.log('[SocialPanel DEBUG_V2] Current User ID:', currentUser.id);

                if (friendsData && friendsData.length > 0) {
                    const friendIds = friendsData.map(f => f.friend_id);
                    const { data: profiles, error: profilesError } = await supabase
                        .from('profiles')
                        .select('*')
                        .in('id', friendIds);

                    if (profilesError) console.error('[SocialPanel] Profiles Query Error:', profilesError);
                    console.log('[SocialPanel] Profiles Fetched:', profiles?.length);

                    if (profiles) {
                        const mapped = profiles.map(p => ({
                            id: p.id,
                            name: p.username || 'Unknown',
                            avatar: p.avatar_url
                        }));
                        setUsers(mapped);
                    }
                } else {
                    console.log('[SocialPanel] No friends found in DB, clearing list.');
                    setUsers([]);
                }
            } else {
                setUsers([]);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
        setLoading(false);
    };

    return (
        <div className="hidden lg:flex flex-col w-80 h-[600px] bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-700/50 overflow-hidden sticky top-4">
            {/* Header / Tabs */}
            <div className="p-4 bg-slate-900/80 border-b border-slate-700/50">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('friends')}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'friends'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                            }`}
                    >
                        <User size={16} /> {language === 'es' ? 'Amigos' : 'Friends'}
                    </button>
                    <button
                        onClick={() => setActiveTab('team')}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'team'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                            }`}
                    >
                        <Shield size={16} /> Team
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {users.map((user) => (
                    <div
                        key={user.id}
                        onClick={() => navigate(`/profile/${user.id}`)}
                        className="group flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800 border border-slate-700/30 hover:border-slate-600 transition-all cursor-pointer"
                    >
                        {/* Avatar */}
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white overflow-hidden">
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    user.name.substring(0, 2).toUpperCase()
                                )}
                            </div>
                            {/* Status Dot */}
                            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${(userStatuses[user.id] || 'offline') === 'online' ? 'bg-green-500' :
                                (userStatuses[user.id] || 'offline') === 'ingame' ? 'bg-orange-500' : 'bg-slate-500'
                                }`} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-white truncate">{user.name}</h4>
                            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                                {userStatuses[user.id] || 'offline'}
                            </p>
                        </div>

                        {/* Hover Actions */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenChat && onOpenChat(user);
                                }}
                                className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"
                                title="Send Message"
                            >
                                <MessageSquare size={14} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const isOffline = (userStatuses[user.id] || 'offline') === 'offline';
                                    if (isOffline) return; // Do nothing if offline

                                    console.log('Invite Button Clicked', user);
                                    if (onInvite) {
                                        onInvite(user);
                                        setInviteStatus(prev => ({ ...prev, [user.id]: 'sent' }));
                                        setTimeout(() => {
                                            setInviteStatus(prev => ({ ...prev, [user.id]: null }));
                                        }, 2000);
                                    }
                                }}
                                className={`p-1.5 rounded-lg transition-colors ${(userStatuses[user.id] || 'offline') === 'offline'
                                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed' // Offline style
                                    : inviteStatus[user.id] === 'sent'
                                        ? 'bg-green-500 text-white'
                                        : 'bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white'
                                    }`}
                                title={(userStatuses[user.id] || 'offline') === 'offline' ? "User is Offline" : (inviteStatus[user.id] === 'sent' ? "Sent!" : "Invite to Party")}
                            >
                                {inviteStatus[user.id] === 'sent' ? <Check size={14} /> : <UserPlus size={14} />}
                            </button>
                        </div>
                    </div>
                ))}
                {users.length === 0 && !loading && (
                    <div className="text-center text-slate-500 mt-10">
                        <p>No players found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
