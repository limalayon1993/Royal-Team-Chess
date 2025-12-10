import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Shield, Trophy, MessageSquare, ArrowLeft, Activity, Users, UserPlus } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { translations } from '../translations';
import { EditProfileModal } from './EditProfileModal';
import { FriendRequestModal } from './FriendRequestModal';

export function UserProfile({ language }) {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [isFriend, setIsFriend] = useState(false);
    const [stats, setStats] = useState({
        points: 0,
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0
    });

    const t = translations[language];
    const isOwnProfile = currentUser?.id === userId;

    useEffect(() => {
        fetchProfile();
    }, [userId]);

    const handleRemoveFriend = async () => {
        if (!confirm(t.removeFriend + '?')) return;

        try {
            const { error } = await supabase.rpc('remove_friend', {
                user_a: currentUser.id,
                user_b: userId
            });

            if (error) throw error;

            setIsFriend(false);

        } catch (err) {
            console.error('Error removing friend:', err);
        }
    };

    const fetchProfile = async () => {
        try {
            setLoading(true);

            // Check if already friends
            if (currentUser && userId && currentUser.id !== userId) {
                const { data: friendData } = await supabase
                    .from('friends')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .eq('friend_id', userId)
                    .maybeSingle(); // Use maybeSingle to avoid 406 on no rows

                setIsFriend(!!friendData);
            }

            // 1. Fetch Profile Data (including new columns if they exist)
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError) {
                console.error('Error fetching profile:', profileError);
                // Only mock if ERROR (e.g. user offline/table missing), but try to be graceful
                setProfile(null);
            } else {
                setProfile(profileData);
                // 2. Set Stats from fetched profile data
                setStats({
                    points: profileData.points || 0,
                    matchesPlayed: (profileData.wins || 0) + (profileData.losses || 0) + (profileData.draws || 0),
                    wins: profileData.wins || 0,
                    draws: profileData.draws || 0,
                    losses: profileData.losses || 0,
                    elo: profileData.elo || 300
                });
            }

        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
                <h1 className="text-4xl font-bold mb-4">User Not Found</h1>
                <button onClick={() => navigate('/', { state: { view: 'main' } })} className="text-blue-400 hover:underline">Return Home</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans overflow-y-auto pb-20">
            {/* Header / Nav */}
            <div className="p-6">
                <button
                    onClick={() => navigate('/', { state: { view: 'main' } })}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} /> Back to Menu
                </button>
            </div>

            <div className="max-w-4xl mx-auto px-6 mt-4">
                {/* Profile Header Card */}
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-3xl p-8 mb-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <User size={200} />
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
                        {/* Avatar Circle */}
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-1 shadow-xl shadow-blue-900/50">
                            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-4xl font-bold text-white">{profile.username?.substring(0, 2).toUpperCase()}</span>
                                )}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">
                                {profile.username}
                            </h1>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-6">
                                <div className="px-4 py-1.5 bg-blue-900/30 border border-blue-500/30 rounded-full text-blue-300 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                                    <Shield size={14} /> {profile.team || (t.noTeam || "No Team")}
                                </div>
                            </div>

                            <div className="flex gap-4 justify-center md:justify-start">
                                {/* Conditional Button Logic */}
                                {isOwnProfile ? (
                                    <>
                                        <button
                                            onClick={() => setShowEditModal(true)}
                                            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all hover:scale-105 border border-slate-600 flex items-center gap-2 cursor-pointer"
                                        >
                                            Edit Profile
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => navigate('/', { state: { view: 'main' } })}
                                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all hover:scale-105 shadow-lg shadow-blue-900/30 flex items-center gap-2"
                                        >
                                            <MessageSquare size={18} /> {t.sendMessage || "Send Message"}
                                        </button>

                                        {isFriend ? (
                                            <button
                                                onClick={handleRemoveFriend}
                                                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all hover:scale-105 shadow-lg shadow-red-900/30 flex items-center gap-2"
                                            >
                                                <Users size={18} /> {t.removeFriend || "Remove Friend"}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setShowRequestModal(true)}
                                                className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all hover:scale-105 shadow-lg shadow-green-900/30 flex items-center gap-2"
                                            >
                                                <UserPlus size={18} /> {t.sendFriendRequest || "Send Friend Request"}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid - Simplified to 2 columns */}
                <div className="grid md:grid-cols-2 gap-6 mb-8 max-w-2xl mx-auto">
                    {/* Points Card */}
                    <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 hover:border-blue-500/30 transition-all group">
                        <div className="flex items-center gap-3 mb-2 text-slate-400 uppercase text-xs font-bold tracking-wider">
                            <Activity size={16} className="text-blue-400" /> {t.seasonPoints || "Season Points"}
                        </div>
                        <div className="text-4xl font-black text-white mb-1 group-hover:text-blue-300 transition-colors">
                            {stats.points}
                        </div>
                        <div className="text-sm text-slate-500">
                            {t.rankedPoints || "Ranked Points (Quick Match)"}
                        </div>
                    </div>

                    {/* Elo Card */}
                    <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 hover:border-yellow-500/30 transition-all group">
                        <div className="flex items-center gap-3 mb-2 text-slate-400 uppercase text-xs font-bold tracking-wider">
                            <Trophy size={16} className="text-yellow-400" /> ELO
                        </div>
                        <div className="text-4xl font-black text-white mb-1 group-hover:text-yellow-300 transition-colors">
                            {stats.elo}
                        </div>
                        <div className="text-sm text-slate-500">
                            Global Rating
                        </div>
                    </div>
                </div>

                {/* Trophies Section - Split */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Individual Trophies */}
                    <div className="bg-slate-800/30 rounded-3xl p-8 border border-slate-700/50">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <User className="text-purple-400" size={24} /> Individual Trophies
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            {[1, 2].map((i) => (
                                <div key={i} className="aspect-square bg-slate-900/50 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center p-4 text-center opacity-60 hover:opacity-100 transition-opacity cursor-help">
                                    <Trophy size={28} className="text-slate-600 mb-2" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Coming Soon</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Team Trophies */}
                    <div className="bg-slate-800/30 rounded-3xl p-8 border border-slate-700/50">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <Users className="text-emerald-400" size={24} /> Team Trophies
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            {[1, 2].map((i) => (
                                <div key={i} className="aspect-square bg-slate-900/50 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center p-4 text-center opacity-60 hover:opacity-100 transition-opacity cursor-help">
                                    <Trophy size={28} className="text-slate-600 mb-2" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Coming Soon</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <EditProfileModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                profile={profile}
                language={language}
            />

            <FriendRequestModal
                isOpen={showRequestModal}
                onClose={() => setShowRequestModal(false)}
                currentUser={currentUser}
                targetUser={profile}
                language={language}
            />
        </div >
    );
}
