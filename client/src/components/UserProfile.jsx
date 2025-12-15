import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Shield, Trophy, MessageSquare, ArrowLeft, Activity, Users, UserPlus } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { translations } from '../translations';
import { EditProfileModal } from './EditProfileModal';
import { FriendRequestModal } from './FriendRequestModal';
import TrophyList from './TrophyList';

import { UserStatistics } from './UserStatistics';

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
                .eq('id', userId)
                .single();

            // 1.5 Fetch Club Info
            let clubBox = null;
            if (!profileError && profileData) {
                const { data: memberData } = await supabase
                    .from('club_members')
                    .select('club:clubs(id, name, division)')
                    .eq('user_id', userId)
                    .maybeSingle();

                if (memberData?.club) {
                    clubBox = memberData.club;
                }
            }

            if (profileError) {
                console.error('Error fetching profile:', profileError);
                // Only mock if ERROR (e.g. user offline/table missing), but try to be graceful
                setProfile(null);
            } else {
                setProfile({ ...profileData, club: clubBox });
                // 2. Set Stats from fetched profile data
                // NEW: Get Season Points from user_stats (latest/current season)
                const now = new Date();
                const currentSeasonId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const { data: statsData } = await supabase
                    .from('user_stats')
                    .select('season_points')
                    .eq('user_id', userId)
                    .eq('season_id', currentSeasonId)
                    .maybeSingle();

                setStats({
                    points: statsData?.season_points || 0, // CORRECT SOURCE
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
                    <ArrowLeft size={20} /> {t.backToMenu}
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
                                {profile.club && (
                                    <button
                                        onClick={() => navigate(`/club/${profile.club.id}`)}
                                        className="px-4 py-1.5 bg-purple-900/30 border border-purple-500/30 rounded-full text-purple-300 font-bold text-sm uppercase tracking-wide flex items-center gap-2 hover:bg-purple-900/50 transition-colors"
                                    >
                                        <Shield size={14} /> {profile.club.name}
                                        {profile.club.division && (
                                            <span className="bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded ml-1 text-xs">
                                                {t.division} {profile.club.division}
                                            </span>
                                        )}
                                    </button>
                                )}
                                {!profile.club && (
                                    <div className="px-4 py-1.5 bg-slate-800 border border-slate-700 rounded-full text-slate-400 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                                        <Shield size={14} /> {t.freeAgent}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4 justify-center md:justify-start flex-wrap">
                                {/* Stats Button (Always Visible) */}
                                {
                                    /* Stats Button Removed (Auto-Embedded) */
                                }
                                {/* Conditional Button Logic */}
                                {isOwnProfile ? (
                                    <>
                                        <button
                                            onClick={() => setShowEditModal(true)}
                                            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all hover:scale-105 border border-slate-600 flex items-center gap-2 cursor-pointer"
                                        >
                                            {t.editProfile}
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => navigate('/', { state: { view: 'main' } })}
                                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all hover:scale-105 shadow-lg shadow-blue-900/30 flex items-center gap-2"
                                        >
                                            <MessageSquare size={18} /> {t.sendMessage}
                                        </button>

                                        {isFriend ? (
                                            <button
                                                onClick={handleRemoveFriend}
                                                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all hover:scale-105 shadow-lg shadow-red-900/30 flex items-center gap-2"
                                            >
                                                <Users size={18} /> {t.removeFriend}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setShowRequestModal(true)}
                                                className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all hover:scale-105 shadow-lg shadow-green-900/30 flex items-center gap-2"
                                            >
                                                <UserPlus size={18} /> {t.sendFriendRequest}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid - Embedded */}
                <div className="mb-8">
                    <UserStatistics language={language} embedded={true} />
                </div>

                {/* Trophies Section */}
                <div className="mb-8">
                    <TrophyList entityId={userId} type="PLAYER" title={t.individualTrophies} language={language} />
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
