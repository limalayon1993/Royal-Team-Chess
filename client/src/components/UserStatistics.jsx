import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Activity, Trophy, ArrowLeft, History, Swords, Clock, Flag, PieChart, Info } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { translations } from '../translations';

export function UserStatistics({ language, embedded = false }) {
    const { userId } = useParams();
    const navigate = useNavigate();
    const t = translations[language];

    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState(null); // 'YYYY-MM' or null (current)
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, [userId]);

    useEffect(() => {
        if (selectedSeason) {
            fetchStats(selectedSeason);
        }
    }, [selectedSeason]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // 1. Get Username
            const { data: profile } = await supabase.from('profiles').select('username').eq('id', userId).single();
            if (profile) setUsername(profile.username);

            // 2. Get Available History Seasons
            const { data: historyData, error: historyError } = await supabase
                .from('user_stats')
                .select('season_id')
                .eq('user_id', userId)
                .order('season_id', { ascending: false })
                .limit(6);

            if (!historyError && historyData) {
                setHistory(historyData.map(h => h.season_id));
            }

            // 3. Get Current/Latest Stats
            // Default to current month string
            const date = new Date();
            const currentSeason = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            // If history has data, default to most recent? Or always current?
            // Let's optimize: if we have history, show the latest available. 
            // If not (no games played ever), show current (empty).

            await fetchStats(currentSeason);
            setSelectedSeason(currentSeason);

        } catch (e) {
            console.error('Error loading stats page:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async (seasonId) => {
        try {
            const { data, error } = await supabase
                .from('user_stats')
                .select('*')
                .eq('user_id', userId)
                .eq('season_id', seasonId)
                .maybeSingle();

            if (error) throw error;
            setStats(data || {
                confrontations_played: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                season_points: 0,
                pieces_eaten: 0,
                wins_checkmate: 0, wins_time: 0, wins_resignation: 0,
                losses_checkmate: 0, losses_time: 0, losses_resignation: 0
            });
        } catch (e) {
            console.error('Error fetching stats:', e);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const winRate = stats.confrontations_played > 0
        ? Math.round((stats.wins / stats.confrontations_played) * 100)
        : 0;

    const diff = stats.wins - stats.losses;
    const diffColor = diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-slate-400';
    const diffSign = diff > 0 ? '+' : '';

    return (
        <div className={embedded ? "w-full text-white font-sans" : "min-h-screen bg-slate-900 text-white font-sans overflow-y-auto pb-20"}>
            {!embedded && (
                <div className="p-6">
                    <button
                        onClick={() => navigate(`/profile/${userId}`)}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors uppercase font-bold text-sm tracking-widest"
                    >
                        <ArrowLeft size={16} /> {t.backToProfile}
                    </button>
                </div>
            )}

            <div className={`max-w-5xl mx-auto px-6 ${embedded ? 'mt-0' : 'mt-4'}`}>

                {/* Header & Filter */}
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-4 border-b border-slate-800 pb-8">
                    <div>
                        <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-3">
                            <Activity className="text-blue-500" size={32} />
                            {t.statistics}
                        </h1>
                        <p className="text-slate-400 text-lg">
                            {username} • {t.season}: <span className="text-blue-400 font-mono font-bold">{selectedSeason}</span>
                        </p>
                    </div>

                    <div className="relative z-20">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                            {t.history}
                        </label>
                        <div className="relative">
                            <select
                                value={selectedSeason || ''}
                                onChange={(e) => setSelectedSeason(e.target.value)}
                                className="appearance-none bg-slate-800 border border-slate-600 text-white rounded-xl py-3 pl-4 pr-10 font-mono font-bold hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all w-48 cursor-pointer"
                            >
                                <option value="" disabled>{t.selectSeason}</option>
                                {history.length === 0 && <option value={selectedSeason}>{selectedSeason} ({t.current})</option>}
                                {history.map(h => (
                                    <option key={h} value={h}>{h}</option>
                                ))}
                                {/* If current season not in history yet (no games maybe?), ensure it's selectable if active */}
                                {!history.includes(selectedSeason) && (
                                    <option value={selectedSeason}>{selectedSeason} ({t.current})</option>
                                )}
                            </select>
                            <History size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Trophy size={64} />
                        </div>
                        <div className="relative z-10">
                            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{t.seasonPoints}</div>
                            <div className="text-4xl font-black text-blue-400">{stats.season_points}</div>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Activity size={64} />
                        </div>
                        <div className="relative z-10">
                            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{t.confrontationsPlayed}</div>
                            <div className="text-4xl font-black text-white">{stats.confrontations_played}</div>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <PieChart size={64} />
                        </div>
                        <div className="relative z-10">
                            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{t.winRate}</div>
                            <div className="text-4xl font-black text-emerald-400">{winRate}%</div>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Swords size={64} />
                        </div>
                        <div className="relative z-10">
                            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{t.winLossDiff}</div>
                            <div className={`text-4xl font-black ${diffColor}`}>{diffSign}{diff}</div>
                        </div>
                    </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="grid md:grid-cols-2 gap-8">

                    {/* Game Outcomes Table */}
                    <div className="bg-slate-800/30 rounded-3xl p-8 border border-slate-700/50">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Swords size={20} className="text-purple-400" /> {t.confrontationOutcomes}
                        </h3>

                        <div className="space-y-4">
                            {/* Header */}
                            <div className="grid grid-cols-4 text-xs font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-700">
                                <div>{t.result}</div>
                                <div className="text-center">{t.total}</div>
                                <div className="text-center text-emerald-400">{t.wins}</div>
                                <div className="text-center text-red-400">{t.losses}</div>
                            </div>

                            {/* Checkmate */}
                            <div className="grid grid-cols-4 items-center">
                                <div className="flex items-center gap-2 text-slate-300 font-medium">
                                    <Swords size={14} className="text-slate-500" /> {t.checkmate}
                                </div>
                                <div className="text-center font-bold text-slate-200">
                                    {stats.wins_checkmate + stats.losses_checkmate}
                                </div>
                                <div className="text-center font-bold text-emerald-400/80 bg-emerald-900/10 py-1 rounded">
                                    {stats.wins_checkmate}
                                </div>
                                <div className="text-center font-bold text-red-400/80 bg-red-900/10 py-1 rounded">
                                    {stats.losses_checkmate}
                                </div>
                            </div>

                            {/* Time */}
                            <div className="grid grid-cols-4 items-center">
                                <div className="flex items-center gap-2 text-slate-300 font-medium">
                                    <Clock size={14} className="text-slate-500" /> {t.timeout}
                                </div>
                                <div className="text-center font-bold text-slate-200">
                                    {stats.wins_time + stats.losses_time}
                                </div>
                                <div className="text-center font-bold text-emerald-400/80 bg-emerald-900/10 py-1 rounded">
                                    {stats.wins_time}
                                </div>
                                <div className="text-center font-bold text-red-400/80 bg-red-900/10 py-1 rounded">
                                    {stats.losses_time}
                                </div>
                            </div>

                            {/* Resignation */}
                            <div className="grid grid-cols-4 items-center">
                                <div className="flex items-center gap-2 text-slate-300 font-medium">
                                    <Flag size={14} className="text-slate-500" /> {t.resignation}
                                </div>
                                <div className="text-center font-bold text-slate-200">
                                    {stats.wins_resignation + stats.losses_resignation}
                                </div>
                                <div className="text-center font-bold text-emerald-400/80 bg-emerald-900/10 py-1 rounded">
                                    {stats.wins_resignation}
                                </div>
                                <div className="text-center font-bold text-red-400/80 bg-red-900/10 py-1 rounded">
                                    {stats.losses_resignation}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-700/50 flex justify-between items-center">
                            <div className="text-sm font-medium text-slate-400">{t.totalDraws}</div>
                            <div className="text-xl font-bold text-slate-200">{stats.draws}</div>
                        </div>
                    </div>

                    {/* Fun Stats */}
                    <div className="bg-slate-800/30 rounded-3xl p-8 border border-slate-700/50">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Info size={20} className="text-blue-400" /> {t.performance}
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-bold text-slate-400 uppercase">{t.piecesCaptured}</span>
                                    <span className="text-2xl font-black text-white">{stats.pieces_eaten}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-700/50 rounded-full overflow-hidden">
                                    {/* Mock progress bar for visual flair */}
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                        style={{ width: `${Math.min((stats.pieces_eaten / 100) * 100, 100)}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">{t.piecesCapturedDesc}</p>
                            </div>

                            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400">
                                        <Info size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-200 mb-1">{t.seasonReset}</h4>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            {t.seasonResetDesc}
                                            {t.historySaved}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
