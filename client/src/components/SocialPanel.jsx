import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Shield, MessageSquare, UserPlus } from 'lucide-react';
import { supabase } from '../supabaseClient';

export function SocialPanel({ language, onOpenChat }) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('friends'); // 'friends' or 'team'
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, [activeTab]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            if (activeTab === 'friends') {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .limit(20);

                if (data) {
                    const mapped = data.map(p => ({
                        id: p.id,
                        name: p.username || 'Unknown',
                        status: 'offline', // default
                        avatar: p.avatar_url
                    }));
                    setUsers(mapped);
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
                        <User size={16} /> Players
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
                            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${user.status === 'online' ? 'bg-green-500' : 'bg-slate-500'
                                }`} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-white truncate">{user.name}</h4>
                            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                                {user.status}
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
                            <button className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white transition-colors" title="Invite to Party">
                                <UserPlus size={14} />
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
