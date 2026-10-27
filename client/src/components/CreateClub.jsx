import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Users, Trophy, Flag, Check, X, Crown, Lock, Sparkles, Loader2, Star } from 'lucide-react';
import { translations } from '../translations';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { PricingModal } from './PricingModal';

export function CreateClub({ language }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const t = translations[language] || translations.es;

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Estado del tier del usuario para control de acceso suave (Gating)
    const [userTier, setUserTier] = useState('free');
    const [checkingTier, setCheckingTier] = useState(true);
    const [showPricingModal, setShowPricingModal] = useState(false);

    const fetchUserTier = useCallback(async () => {
        if (!user) {
            setUserTier('free');
            setCheckingTier(false);
            return;
        }

        try {
            setCheckingTier(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('tier')
                .eq('id', user.id)
                .single();

            if (!error && data?.tier) {
                setUserTier(data.tier.toLowerCase());
            } else {
                setUserTier('free');
            }
        } catch (err) {
            console.warn('[CreateClub] Error comprobando tier de usuario:', err);
            setUserTier('free');
        } finally {
            setCheckingTier(false);
        }
    }, [user]);

    useEffect(() => {
        fetchUserTier();
    }, [fetchUserTier]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!user) {
            setError(t.mustBeLoggedIn || 'Debes iniciar sesión.');
            setLoading(false);
            return;
        }

        // Validación defensiva en frontend antes de llamada API
        if (userTier !== 'pro') {
            setError(t.clubGatingTitle || 'La fundación de clubes oficiales está reservada para el nivel Profesional.');
            setLoading(false);
            setShowPricingModal(true);
            return;
        }

        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const serverUrl = isLocal ? 'http://localhost:3000' : (import.meta.env.VITE_SERVER_URL || 'http://localhost:3000');

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
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 cursor-pointer"
                >
                    <ArrowLeft size={20} /> {t.back || 'Volver'}
                </button>

                {checkingTier ? (
                    <div className="glass-panel p-12 border border-slate-700/50 flex flex-col items-center justify-center text-center">
                        <Loader2 className="animate-spin text-emerald-400 mb-4" size={40} />
                        <p className="text-slate-400 font-medium">{language === 'es' ? 'Verificando credenciales federativas...' : 'Verifying competitive credentials...'}</p>
                    </div>
                ) : userTier !== 'pro' ? (
                    /* ========================================================
                       PANTALLA DE CONTROL DE ACCESO SUAVE (GATING TÁCTICO)
                       Pilar 6 - Tiers Oficiales: Requiere Suscripción Profesional
                       ======================================================== */
                    <div className="relative rounded-3xl p-8 md:p-10 bg-gradient-to-b from-slate-800/90 via-slate-900 to-slate-950 border-2 border-emerald-500/60 shadow-2xl shadow-emerald-950/50 overflow-hidden text-center">
                        {/* Glow de fondo */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-emerald-500/10 blur-3xl pointer-events-none rounded-full" />

                        {/* Icono de Corona de Nivel Profesional */}
                        <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500/20 via-emerald-500/20 to-teal-500/20 border-2 border-emerald-500/50 flex items-center justify-center mb-6 shadow-xl shadow-emerald-950/40">
                            <Crown size={48} className="text-emerald-400" fill="currentColor" />
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-slate-900 border border-emerald-400 flex items-center justify-center text-amber-400 shadow-md">
                                <Lock size={14} />
                            </div>
                        </div>

                        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider mb-4">
                            <Sparkles size={14} />
                            {language === 'es' ? 'Nivel 3: Profesional Requerido' : 'Tier 3: Professional Required'}
                        </div>

                        <h1 className="text-3xl md:text-4xl font-black mb-4 tracking-tight text-white">
                            {t.clubGatingTitle || 'Fundación de Clubes Oficiales - Reservado para Nivel Profesional'}
                        </h1>

                        <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-xl mx-auto mb-8 font-light">
                            {t.clubGatingDesc || 'Los Clubes Oficiales de Royal Team Chess representan la élite competitiva del ecosistema. Con plantillas de hasta 16 jugadores federados, compiten en las Ligas Nacionales piramidales y la Copa Mundial de Clubes. La fundación y presidencia de un club oficial requiere una suscripción Profesional (10,00 € / mes).'}
                        </p>

                        {/* Bloque Táctico de Privilegios de Club */}
                        <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-5 mb-8 text-left space-y-3.5 max-w-lg mx-auto backdrop-blur-sm">
                            <div className="flex items-start gap-3 text-slate-200 text-sm">
                                <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
                                    <Check size={16} />
                                </div>
                                <span className="font-medium">{t.clubGatingPerk1 || 'Presidente y Fundador de un club federado de 16 plazas'}</span>
                            </div>
                            <div className="flex items-start gap-3 text-slate-200 text-sm">
                                <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
                                    <Check size={16} />
                                </div>
                                <span className="font-medium">{t.clubGatingPerk2 || 'Participación en Ligas Nacionales y Copas Continentales'}</span>
                            </div>
                            <div className="flex items-start gap-3 text-slate-200 text-sm">
                                <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
                                    <Check size={16} />
                                </div>
                                <span className="font-medium">{t.clubGatingPerk3 || 'Ventana oficial de traspasos y fichajes entre temporadas'}</span>
                            </div>
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
                            <button
                                onClick={() => setShowPricingModal(true)}
                                className="w-full sm:w-auto flex-1 py-4 px-6 rounded-2xl font-black text-sm md:text-base bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 hover:from-amber-400 hover:via-emerald-400 hover:to-teal-400 text-slate-950 shadow-xl shadow-emerald-950/60 transition-all transform hover:scale-[1.03] flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Crown size={18} fill="currentColor" />
                                <span>{t.clubGatingUpgradeBtn || 'Desbloquear Clubes Oficiales - Hacerse Pro'}</span>
                            </button>

                            <button
                                onClick={() => navigate('/')}
                                className="w-full sm:w-auto py-4 px-6 rounded-2xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
                            >
                                {t.clubGatingExploreAlliances || 'Volver al Menú'}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ========================================================
                       FORMULARIO DE FUNDACIÓN DE CLUB OFICIAL (PRO TIER)
                       ======================================================== */
                    <>
                        <div className="text-center mb-10">
                            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-900/50">
                                <Flag size={40} className="text-white" />
                            </div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                                <Crown size={13} fill="currentColor" />
                                {language === 'es' ? 'Fundación Oficial de Club (Pro Tier)' : 'Official Club Founding (Pro Tier)'}
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
                                    className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transform transition-all cursor-pointer ${loading
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
                    </>
                )}
            </div>

            {/* Modal de Precios y Tiers */}
            <PricingModal
                isOpen={showPricingModal}
                onClose={() => {
                    setShowPricingModal(false);
                    fetchUserTier();
                }}
                language={language}
                currentTier={userTier}
            />
        </div>
    );
}

export default CreateClub;
