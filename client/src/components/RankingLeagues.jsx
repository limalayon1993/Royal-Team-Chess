import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Medal, AlertCircle, ChevronDown, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { translations } from '../translations';

export function RankingLeagues({ language }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const t = translations[language];

    const [loading, setLoading] = useState(true);
    const [standings, setStandings] = useState([]);
    const [division, setDivision] = useState(1);
    const [seasonId, setSeasonId] = useState(''); // Default to current
    const [historySeasons, setHistorySeasons] = useState([]);

    useEffect(() => {
        // Calculate current season defaults
        const now = new Date();
        const currentId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        setSeasonId(currentId);

        // Generate history (last 6 months)
        const hist = [];
        for (let i = 0; i < 6; i++) {
            const d = new Date(now);
            d.setMonth(d.getMonth() - i);
            hist.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
        setHistorySeasons(hist);

        fetchStandings(currentId, 1);
    }, []);

    const fetchStandings = async (targetSeason, targetDiv) => {
        setLoading(true);
        try {
            // Using DB helper exposed via RPC or direct select if policies allow.
            // Direct select seems safer for now given RLS usually allows read.
            // We need to fetch `club_seasonal_stats` joined with `clubs`.

            const { data, error } = await supabase
                .from('club_seasonal_stats')
                .select(`
                    *,
                    club:clubs (id, name, logo_url, division)
                `)
                .eq('season_id', targetSeason)
                // Filter by division Logic:
                // Ideally stats have division snapshot. 
                // If not, we might need to rely on current club division if season is current?
                // But let's assume `division` column exists as we added it to schema plan.
                // For MVP, if division column is null in old rows, we might assume Div 1.
                // .eq('division', targetDiv); // Uncomment if column exists and populated
                .order('season_points', { ascending: false })
                .order('matches_won', { ascending: false });

            if (error) throw error;

            // Client side filter if needed or strictly Division Logic
            // Robustness Fix: specific division, then club division fallback, then default 1. Loose equality for string/number safety.
            const filtered = data.filter(r => (r.division || r.club?.division || 1) == targetDiv);
            setStandings(filtered);
            setDivision(targetDiv);
            setSeasonId(targetSeason);

        } catch (err) {
            console.error('Error fetching standings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSeasonChange = (e) => {
        fetchStandings(e.target.value, division);
    };

    const getRankStyle = (rank) => {
        if (rank === 1) return 'text-yellow-400 font-bold';
        if (rank === 2) return 'text-gray-300 font-bold';
        if (rank === 3) return 'text-amber-600 font-bold';
        return 'text-slate-400';
    };

    const getRowBg = (rank, total) => {
        // Division 1: Bottom 3 Red (Relegation)
        if (division === 1) {
            if (total > 5 && rank > total - 3) return 'bg-red-500/10 border-red-500/20 shadow-[inset_4px_0_0_0_rgba(239,68,68,1)]';
            return 'hover:bg-slate-800/30 border-transparent border-l-4';
        }

        // Divisions 2-6 (Ascenso y Descenso)
        // Top 3 Green (Ascenso)
        if (rank <= 3) return 'bg-green-500/10 border-green-500/20 shadow-[inset_4px_0_0_0_rgba(34,197,94,1)]';

        // Bottom 3 Red (Relegation)
        if (total > 5 && rank > total - 3) return 'bg-red-500/10 border-red-500/20 shadow-[inset_4px_0_0_0_rgba(239,68,68,1)]';

        return 'hover:bg-slate-800/30 border-transparent border-l-4';
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans overflow-y-auto pb-20">
            {/* Nav */}
            <div className="p-6">
                <button
                    onClick={() => navigate('/', { state: { view: 'main' } })}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} /> {t.back}
                </button>
            </div>

            <div className="max-w-6xl mx-auto px-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                    <div>
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600 mb-2">
                            {t.rankingLeagues}
                        </h1>
                        <p className="text-slate-400">{t.rankingLeaguesSubtitle}</p>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-4">
                        <select
                            value={seasonId}
                            onChange={handleSeasonChange}
                            className="bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none"
                        >
                            {historySeasons.map(s => (
                                <option key={s} value={s}>{s === historySeasons[0] ? `${s} (${t.current})` : s}</option>
                            ))}
                        </select>

                        <select
                            value={division}
                            onChange={(e) => fetchStandings(seasonId, parseInt(e.target.value))}
                            className="bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                        >
                            {[1, 2, 3, 4, 5, 6].map(d => (
                                <option key={d} value={d}>{t.division} {d}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-3xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-800/80 text-slate-400 uppercase text-xs tracking-wider border-b border-slate-700">
                                    <th className="p-6 font-bold w-16">{t.rankAbbr}</th>
                                    <th className="p-6 font-bold">{t.club}</th>
                                    <th className="p-6 font-bold text-center">{t.ptsAbbr}</th>
                                    <th className="p-6 font-bold text-center hidden md:table-cell">{t.wAbbr}</th>
                                    <th className="p-6 font-bold text-center hidden md:table-cell">{t.dAbbr}</th>
                                    <th className="p-6 font-bold text-center hidden md:table-cell">{t.lAbbr}</th>
                                    <th className="p-6 font-bold text-center hidden md:table-cell">{t.diffAbbr}</th>

                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {loading && (
                                    <tr>
                                        <td colSpan="8" className="p-12 text-center text-slate-500 animate-pulse">
                                            {t.loadingStandings}
                                        </td>
                                    </tr>
                                )}

                                {!loading && standings.length === 0 && (
                                    <tr>
                                        <td colSpan="8" className="p-12 text-center text-slate-500">
                                            {t.noClubsFound}
                                        </td>
                                    </tr>
                                )}

                                {!loading && standings.map((row, index) => {
                                    const rank = index + 1;
                                    const diff = (row.matches_won || 0) - (row.matches_lost || 0); // Simplified Diff

                                    return (
                                        <tr key={row.club_id} className={`transition-colors ${getRowBg(rank, standings.length)}`}>
                                            <td className="p-6 font-black text-lg">
                                                <span className={getRankStyle(rank)}>{rank}</span>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate(`/club/${row.club_id}`)}>
                                                    <div className="w-10 h-10 rounded-xl bg-slate-700 overflow-hidden shrink-0 border border-slate-600">
                                                        {row.club?.logo_url ? (
                                                            <img src={row.club.logo_url} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                                                                {row.club?.name?.substring(0, 2).toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="font-bold text-white text-lg">
                                                        {row.club?.name}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg font-black text-lg border border-blue-500/30 min-w-[3rem]">
                                                    {row.season_points || 0}
                                                </span>
                                            </td>
                                            <td className="p-6 text-center font-bold text-emerald-400 hidden md:table-cell">{row.matches_won || 0}</td>
                                            <td className="p-6 text-center font-bold text-slate-400 hidden md:table-cell">{row.matches_drawn || 0}</td>
                                            <td className="p-6 text-center font-bold text-red-400 hidden md:table-cell">{row.matches_lost || 0}</td>
                                            <td className="p-6 text-center font-bold text-slate-300 hidden md:table-cell">
                                                {diff > 0 ? `+${diff}` : diff}
                                            </td>

                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-6 text-xs font-bold text-slate-500 uppercase tracking-widest px-4">
                    {division === 1 && (
                        <>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-500/20 border border-red-500/50 rounded-sm"></div>
                                {t.relegationZone}
                            </div>
                        </>
                    )}
                    {division > 1 && (
                        <>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500/20 border border-green-500/50 rounded-sm"></div>
                                {t.promotionZone}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-500/20 border border-red-500/50 rounded-sm"></div>
                                {t.relegationZone}
                            </div>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}

export default RankingLeagues;
