import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Users, Trophy, Flag, Check, X } from 'lucide-react';
import { translations } from '../translations';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export function CreateClub({ language }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const t = translations[language];

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!user) {
            setError(t.mustBeLoggedIn);
            setLoading(false);
            return;
        }

        try {
            // Determine Server URL (Force localhost if local)
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const serverUrl = isLocal ? 'http://localhost:3000' : (import.meta.env.VITE_SERVER_URL || 'http://localhost:3000');

            // Call API endpoint
            const response = await fetch(`${serverUrl}/api/clubs/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description,
                    logoUrl,
                    ownerId: user.id
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || t.clubCreationFailed);
            }

            // Success! Navigate to the new club
            console.log('Club Created:', data);
            navigate(`/club/${data.club.id}`);

        } catch (err) {
            console.error('Create Club Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6 pt-24">
            <div className="max-w-2xl mx-auto animate-fade-in">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8"
                >
                    <ArrowLeft size={20} /> {t.back}
                </button>

                <div className="text-center mb-10">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-900/50">
                        <Flag size={40} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-black mb-2">{t.createClubTitle}</h1>
                    <p className="text-slate-400 text-lg">{t.createClubSubtitle}</p>
                </div>

                <div className="glass-panel p-8 border border-slate-700/50">
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-200">
                            <X size={20} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">{t.clubName}</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                                placeholder={t.clubNamePlaceholder}
                                required
                                minLength={3}
                                maxLength={30}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">{t.clubDescription}</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 min-h-[100px]"
                                placeholder={t.clubDescriptionPlaceholder}
                                maxLength={200}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">{t.logoUrl}</label>
                            <input
                                type="url"
                                value={logoUrl}
                                onChange={(e) => setLogoUrl(e.target.value)}
                                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                                placeholder="https://example.com/logo.png"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transform transition-all ${loading
                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-[1.02] shadow-lg shadow-emerald-900/30'
                                }`}
                        >
                            {loading ? (
                                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                            ) : (
                                <>
                                    <Check size={20} /> {t.createClubBtn}
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
