import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { BarChart2, Calendar, Trophy, XCircle, MinusCircle, CheckCircle } from 'lucide-react';

export function ClubStatistics({ clubId }) {
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState('');
    const [loading, setLoading] = useState(true);

    // Initial Load
    useEffect(() => {
        loadHistory();
    }, [clubId]);

    // Load Stats when season changes
    useEffect(() => {
        if (selectedSeason) {
            loadStats(selectedSeason);
        }
    }, [selectedSeason]);

    const loadHistory = async () => {
        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const serverUrl = isLocal ? 'http://localhost:3000' : (import.meta.env.VITE_SERVER_URL || 'http://localhost:3000');
            // Actually, I didn't make an endpoint for history list?
            // db.js has `getClubStatHistoryList`.
            // But API index.js? I didn't check if I exposed it.
            // Let's assume I can use Supabase directly for read-only if API is missing, 
            // OR I can default to current season if history fails.

            // To be safe and quick: fetch current season + last 6 manually constructed?
            // No, accurate way:
            const { data: historyData } = await supabase
                .from('club_seasonal_stats')
                .select('season_id')
                .eq('club_id', clubId)
                .order('season_id', { ascending: false })
                .limit(6);

            const seasons = historyData?.map(d => d.season_id) || [];
            setHistory(seasons);

            if (seasons.length > 0) setSelectedSeason(seasons[0]);
            else {
                // If no history, maybe just show Current (derived from Date)?
                const d = new Date();
                const current = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                setSelectedSeason(current);
            }

        } catch (e) {
            console.error('Error loading history:', e);
        }
    };

    const loadStats = async (seasonId) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('club_seasonal_stats')
                .select('*')
                .eq('club_id', clubId)
                .eq('season_id', seasonId)
                .maybeSingle();

            if (error) throw error;
            setStats(data || {
                games_played: 0,
                games_won: 0,
                games_lost: 0,
                games_drawn: 0,
                season_points: 0
            });
        } catch (e) {
            console.error('Error loading stats:', e);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !stats) return <div className="p-8 text-center text-slate-500">Loading stats...</div>;

    return (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <BarChart2 className="text-emerald-400" /> Season Statistics
                </h3>

                <div className="relative">
                    <select
                        value={selectedSeason}
                        onChange={(e) => setSelectedSeason(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg py-2 pl-4 pr-10 text-sm font-bold appearance-none cursor-pointer hover:border-emerald-500 focus:outline-none"
                    >
                        {history.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                        {history.length === 0 && <option>{selectedSeason}</option>}
                    </select>
                    <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Season Points"
                    value={stats.season_points}
                    icon={<Trophy size={24} className="text-amber-400" />}
                    bg="bg-amber-900/10 border-amber-500/20"
                />
                <StatCard
                    label="Wins"
                    value={stats.games_won}
                    icon={<CheckCircle size={24} className="text-green-400" />}
                    bg="bg-green-900/10 border-green-500/20"
                />
                <StatCard
                    label="Losses"
                    value={stats.games_lost}
                    icon={<XCircle size={24} className="text-red-400" />}
                    bg="bg-red-900/10 border-red-500/20"
                />
                <StatCard
                    label="Draws"
                    value={stats.games_drawn}
                    icon={<MinusCircle size={24} className="text-slate-400" />}
                    bg="bg-slate-700/30 border-slate-600/30"
                />
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between text-sm text-slate-500 font-medium">
                <span>Games Played: {stats.games_played}</span>
                <span>Win Rate: {stats.games_played > 0 ? Math.round((stats.games_won / stats.games_played) * 100) : 0}%</span>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, bg }) {
    return (
        <div className={`p-4 rounded-xl border ${bg} flex flex-col items-center justify-center text-center`}>
            <div className="mb-2 opacity-80">{icon}</div>
            <div className="text-2xl font-black text-white">{value}</div>
            <div className="text-xs font-bold uppercase tracking-wider opacity-60">{label}</div>
        </div>
    );
}
