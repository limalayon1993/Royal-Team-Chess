import React, { useState, useEffect } from 'react';
import { X, Check, Crown, Shield, Zap, Sparkles, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { translations } from '../translations';
import { useAuth } from '../context/AuthContext';

/**
 * ==============================================================================
 * ROYAL TEAM CHESS - PRICING MODAL (PILAR 6: ARQUITECTURA DE MONETIZACIÓN)
 * ==============================================================================
 * Modal comparativo de 3 columnas para tiers oficial de Royal Team Chess:
 * - Nivel 1: GRATIS (0,00 € - Casual, Alianzas, Publicidad Pasiva)
 * - Nivel 2: BÁSICA (5,00 € / mes - Ad-Free, Torneos Oficiales, Trofeos)
 * - Nivel 3: PROFESIONAL (10,00 € / mes - Clubes federados de 16 jugadores, Circuito Pro)
 * 
 * Conecta autoritativamente con:
 * - POST /api/billing/create-checkout-session (Stripe Checkout / Mock Fallback)
 * - POST /api/billing/customer-portal (Gestión de suscripción)
 * ==============================================================================
 */
export function PricingModal({ isOpen, onClose, language = 'es', currentTier = 'free', onOpenAuth }) {
    const { user } = useAuth();
    const t = translations[language] || translations.es;

    const [loadingTier, setLoadingTier] = useState(null); // 'basic' | 'pro' | 'portal'
    const [errorMessage, setErrorMessage] = useState(null);

    // Cerrar con tecla Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !loadingTier) {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, loadingTier, onClose]);

    if (!isOpen) return null;

    const normalizedCurrentTier = (currentTier || 'free').toLowerCase();

    // Obtener la URL base del servidor de forma resiliente
    const getServerUrl = () => {
        const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        return isLocal ? 'http://localhost:3000' : (import.meta.env.VITE_SERVER_URL || 'http://localhost:3000');
    };

    /**
     * Inicia la sesión de suscripción en Stripe Checkout
     * @param {'basic'|'pro'} tierTarget 
     */
    const handleSubscribe = async (tierTarget) => {
        setErrorMessage(null);

        if (!user) {
            if (typeof onOpenAuth === 'function') {
                onClose();
                onOpenAuth('login');
            } else {
                setErrorMessage(t.mustBeLoggedIn || 'Debes iniciar sesión para suscribirte.');
            }
            return;
        }

        try {
            setLoadingTier(tierTarget);
            const serverUrl = getServerUrl();
            const currentUrl = window.location.href;

            const response = await fetch(`${serverUrl}/api/billing/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    tier: tierTarget,
                    returnUrl: currentUrl
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al iniciar la pasarela de pago');
            }

            if (data.url) {
                // Redirigir a la URL de checkout de Stripe o a la simulación provista
                window.location.href = data.url;
            } else {
                throw new Error('Respuesta inválida del servidor de facturación (URL ausente)');
            }
        } catch (err) {
            console.error('[PricingModal] Error en suscripción:', err);
            setErrorMessage(err.message || 'Error de conexión con el servicio de pagos.');
            setLoadingTier(null);
        }
    };

    /**
     * Redirige al portal de clientes de Stripe para cancelar o cambiar método de pago
     */
    const handleManageSubscription = async () => {
        if (!user) return;
        setErrorMessage(null);

        try {
            setLoadingTier('portal');
            const serverUrl = getServerUrl();
            const currentUrl = window.location.href;

            const response = await fetch(`${serverUrl}/api/billing/customer-portal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    returnUrl: currentUrl
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al generar enlace al portal');
            }

            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            console.error('[PricingModal] Error en Customer Portal:', err);
            setErrorMessage(err.message || 'No se pudo abrir el portal de facturación.');
            setLoadingTier(null);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget && !loadingTier) onClose();
            }}
        >
            <div className="relative w-full max-w-5xl my-8 bg-slate-900/95 border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl flex flex-col">
                {/* Botón de Cierre */}
                <button
                    onClick={onClose}
                    disabled={!!loadingTier}
                    className="absolute top-5 right-5 z-20 p-2 rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700/80 transition-all border border-slate-700/50 disabled:opacity-50"
                    aria-label="Cerrar modal"
                >
                    <X size={20} />
                </button>

                {/* Cabecera del Modal */}
                <div className="pt-8 pb-4 px-6 md:px-10 text-center relative overflow-hidden">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
                        <Sparkles size={14} />
                        {language === 'es' ? 'Fase Oficial 1.0 - Monetización Transparente' : 'Official v1.0 - Transparent Monetization'}
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                        {t.pricingTitle || 'Planes y Membresías'}
                    </h2>
                    <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto mt-2 font-medium">
                        {t.pricingSubtitle || 'Elige el nivel competitivo que se adapta a tus metas tácticas en Royal Team Chess.'}
                    </p>

                    {errorMessage && (
                        <div className="mt-4 mx-auto max-w-lg p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 text-sm flex items-center gap-2 text-left">
                            <AlertCircle size={18} className="shrink-0 text-red-400" />
                            <span>{errorMessage}</span>
                        </div>
                    )}
                </div>

                {/* Grid Comparativo de 3 Columnas */}
                <div className="p-6 md:p-10 pt-2 grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                    
                    {/* ========================================================
                        NIVEL 1: GRATIS (Free-to-Play, 0 €)
                       ======================================================== */}
                    <div className={`relative flex flex-col rounded-3xl p-6 bg-slate-800/50 border ${
                        normalizedCurrentTier === 'free' ? 'border-slate-600 bg-slate-800/70 shadow-lg' : 'border-slate-700/40'
                    } transition-all duration-300 hover:border-slate-600`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-700/60 flex items-center justify-center text-slate-300 border border-slate-600/50">
                                <Shield size={24} />
                            </div>
                            {normalizedCurrentTier === 'free' && (
                                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-700 text-slate-200 border border-slate-600">
                                    {t.currentPlan || 'Plan Actual'}
                                </span>
                            )}
                        </div>

                        <h3 className="text-xl font-black text-white tracking-tight">
                            {t.tierFree || 'GRATIS'}
                        </h3>
                        <p className="text-xs text-slate-400 mb-4 font-medium">
                            {t.tierFreeSubtitle || 'Casual y Alianzas Abiertas'}
                        </p>

                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-3xl font-black text-white">{t.tierFreePrice || '0,00 €'}</span>
                            <span className="text-xs text-slate-400 font-semibold">{t.tierFreePeriod || 'para siempre'}</span>
                        </div>

                        {/* Lista de características */}
                        <div className="flex-1 space-y-3 mb-6 text-sm">
                            <div className="flex items-start gap-2.5 text-slate-300">
                                <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                <span>{t.tierFreeFeature1 || 'Partidas casuales ilimitadas (1v1 a 4v4)'}</span>
                            </div>
                            <div className="flex items-start gap-2.5 text-slate-300">
                                <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                <span>{t.tierFreeFeature2 || 'Creación de salas privadas y ligas comunitarias'}</span>
                            </div>
                            <div className="flex items-start gap-2.5 text-slate-300">
                                <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                <span>{t.tierFreeFeature3 || 'Chat de voz espacial WebRTC y telemetría'}</span>
                            </div>
                            <div className="flex items-start gap-2.5 text-slate-300">
                                <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                <span>{t.tierFreeFeature4 || 'Pertenencia a Alianzas libres ilimitadas'}</span>
                            </div>
                            <div className="flex items-start gap-2.5 text-slate-400 text-xs pt-1">
                                <span className="w-4 text-center shrink-0 text-slate-500">•</span>
                                <span>{t.tierFreeFeature5 || 'Publicidad pasiva no intrusiva'}</span>
                            </div>
                            <div className="flex items-start gap-2.5 text-slate-500 text-xs">
                                <X size={14} className="text-slate-600 shrink-0 mt-0.5" />
                                <span>{t.tierFreeNoFeature1 || 'Sin torneos oficiales RTC ni trofeos'}</span>
                            </div>
                            <div className="flex items-start gap-2.5 text-slate-500 text-xs">
                                <X size={14} className="text-slate-600 shrink-0 mt-0.5" />
                                <span>{t.tierFreeNoFeature2 || 'Sin fundar ni militar en Clubes Oficiales'}</span>
                            </div>
                        </div>

                        {/* Botón de Acción */}
                        <button
                            disabled={true}
                            className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all border ${
                                normalizedCurrentTier === 'free'
                                    ? 'bg-slate-800 text-slate-300 border-slate-700 cursor-default'
                                    : 'bg-slate-800/40 text-slate-500 border-slate-700/50 cursor-default'
                            }`}
                        >
                            {normalizedCurrentTier === 'free' ? (t.currentPlan || 'Plan Actual') : (t.tierFree || 'Gratis')}
                        </button>
                    </div>

                    {/* ========================================================
                        NIVEL 2: BÁSICA (5,00 € / mes)
                       ======================================================== */}
                    <div className={`relative flex flex-col rounded-3xl p-6 bg-slate-800/60 border ${
                        normalizedCurrentTier === 'basic' ? 'border-cyan-500/70 shadow-lg shadow-cyan-950/40' : 'border-slate-700/50'
                    } transition-all duration-300 hover:border-cyan-500/40`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 flex items-center justify-center text-cyan-400 border border-cyan-500/30">
                                <Zap size={24} />
                            </div>
                            {normalizedCurrentTier === 'basic' && (
                                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-900/60 text-cyan-300 border border-cyan-500/40">
                                    {t.currentPlan || 'Plan Actual'}
                                </span>
                            )}
                        </div>

                        <h3 className="text-xl font-black text-white tracking-tight">
                            {t.tierBasic || 'BÁSICA'}
                        </h3>
                        <p className="text-xs text-cyan-300/80 mb-4 font-medium">
                            {t.tierBasicSubtitle || 'Competidor Oficial y Sin Publicidad'}
                        </p>

                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-3xl font-black text-cyan-400">{t.tierBasicPrice || '5,00 €'}</span>
                            <span className="text-xs text-slate-400 font-semibold">{t.tierBasicPeriod || '/ mes'}</span>
                        </div>

                        {/* Lista de características */}
                        <div className="flex-1 space-y-3 mb-6 text-sm">
                            <div className="flex items-start gap-2.5 text-white font-medium">
                                <Check size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                                <span>{t.tierBasicFeature1 || '100% Ad-Free (Sin Anuncios)'}</span>
                            </div>
                            <div className="flex items-start gap-2.5 text-slate-200">
                                <Check size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                                <span>{t.tierBasicFeature2 || 'Acceso a Torneos Oficiales periódicos RTC'}</span>
                            </div>
                            <div className="flex items-start gap-2.5 text-slate-200">
                                <Check size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                                <span>{t.tierBasicFeature3 || 'Vitrina de Trofeos y Medallas Oficiales'}</span>
                            </div>
                            <div className="flex items-start gap-2.5 text-slate-300">
                                <Check size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                                <span>{t.tierBasicFeature4 || 'Todo lo incluido en el Nivel Gratis'}</span>
                            </div>
                            <div className="flex items-start gap-2.5 text-slate-500 text-xs pt-1">
                                <X size={14} className="text-slate-600 shrink-0 mt-0.5" />
                                <span>{t.tierBasicNoFeature1 || 'Clubes de 16 jugadores reservados para Pro'}</span>
                            </div>
                        </div>

                        {/* Botón de Acción */}
                        {normalizedCurrentTier === 'basic' ? (
                            <button
                                onClick={handleManageSubscription}
                                disabled={loadingTier === 'portal'}
                                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {loadingTier === 'portal' ? (
                                    <Loader2 size={16} className="animate-spin text-cyan-400" />
                                ) : (
                                    <>
                                        <ExternalLink size={15} />
                                        {t.manageSubscription || 'Gestionar Suscripción'}
                                    </>
                                )}
                            </button>
                        ) : normalizedCurrentTier === 'pro' ? (
                            <button
                                disabled={true}
                                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-slate-800/40 text-slate-500 border border-slate-700/50 cursor-default"
                            >
                                {language === 'es' ? 'Incluido en Profesional' : 'Included in Pro'}
                            </button>
                        ) : (
                            <button
                                onClick={() => handleSubscribe('basic')}
                                disabled={!!loadingTier}
                                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/30 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                            >
                                {loadingTier === 'basic' ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>{t.processingCheckout || 'Preparando Pago...'}</span>
                                    </>
                                ) : (
                                    <span>{t.subscribeBtn || 'Suscribirse'}</span>
                                )}
                            </button>
                        )}
                    </div>

                    {/* ========================================================
                        NIVEL 3: PROFESIONAL (10,00 € / mes) - DESTACADO
                       ======================================================== */}
                    <div className="relative flex flex-col rounded-3xl p-6 bg-gradient-to-b from-slate-800/90 via-slate-850 to-slate-900 border-2 border-emerald-500/80 shadow-2xl shadow-emerald-500/20 transform md:-translate-y-2 transition-all duration-300 hover:border-emerald-400">
                        {/* Badge Superior Destacado */}
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 text-slate-950 font-black text-[11px] uppercase tracking-wider shadow-md shadow-emerald-950 flex items-center gap-1.5 whitespace-nowrap">
                            <Crown size={13} fill="currentColor" />
                            {t.tierProBadge || 'MÁS POPULAR • CIRCUITO PRO'}
                        </div>

                        <div className="flex items-center justify-between mt-2 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/40 shadow-inner">
                                <Crown size={24} fill="currentColor" />
                            </div>
                            {normalizedCurrentTier === 'pro' && (
                                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-900/70 text-emerald-300 border border-emerald-500/50">
                                    {t.currentPlan || 'Plan Actual'}
                                </span>
                            )}
                        </div>

                        <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                            <span>{t.tierPro || 'PROFESIONAL'}</span>
                        </h3>
                        <p className="text-xs text-emerald-300/80 mb-4 font-medium">
                            {t.tierProSubtitle || 'La Cúspide del Ajedrez en Equipo'}
                        </p>

                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-3xl font-black text-emerald-400">{t.tierProPrice || '10,00 €'}</span>
                            <span className="text-xs text-slate-400 font-semibold">{t.tierProPeriod || '/ mes'}</span>
                        </div>

                        {/* Lista de características */}
                        <div className="flex-1 space-y-3 mb-6 text-sm">
                            <div className="flex items-start gap-2.5 text-emerald-200 font-bold bg-emerald-950/30 p-2 rounded-xl border border-emerald-500/20">
                                <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                <span>{t.tierProFeature1 || 'Fundar y presidir Clubes Oficiales (Máx. 16 jugadores)'}</span>
                            </div>
                            <div className="flex items-start gap-2.5 text-slate-200">
                                <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                <span>{t.tierProFeature2 || 'Competir en Ligas Nacionales y Copas Pro'}</span>
                            </div>
                            <div className="flex items-start gap-2.5 text-slate-200">
                                <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                <span>{t.tierProFeature3 || 'Elegibilidad para Selección Nacional y Seleccionador'}</span>
                            </div>
                            <div className="flex items-start gap-2.5 text-slate-200">
                                <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                <span>{t.tierProFeature4 || 'Ventana oficial de traspasos entre temporadas'}</span>
                            </div>
                            <div className="flex items-start gap-2.5 text-slate-300 text-xs">
                                <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                                <span>{t.tierProFeature5 || 'Incluye todos los beneficios Ad-Free, Torneos y Trofeos'}</span>
                            </div>
                        </div>

                        {/* Botón de Acción */}
                        {normalizedCurrentTier === 'pro' ? (
                            <button
                                onClick={handleManageSubscription}
                                disabled={loadingTier === 'portal'}
                                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {loadingTier === 'portal' ? (
                                    <Loader2 size={16} className="animate-spin text-emerald-400" />
                                ) : (
                                    <>
                                        <ExternalLink size={15} />
                                        {t.manageSubscription || 'Gestionar Suscripción'}
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={() => handleSubscribe('pro')}
                                disabled={!!loadingTier}
                                className="w-full py-3.5 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 hover:from-amber-400 hover:via-emerald-400 hover:to-teal-400 text-slate-950 shadow-xl shadow-emerald-900/40 transition-all transform hover:scale-[1.03] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                            >
                                {loadingTier === 'pro' ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin text-slate-950" />
                                        <span>{t.processingCheckout || 'Preparando Pago...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <Crown size={16} fill="currentColor" />
                                        <span>{t.upgradeProBtn || 'Hacerse Pro'}</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Pie del modal de seguridad y cancelación */}
                <div className="p-4 px-6 bg-slate-950/60 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-slate-400">
                        <Shield size={14} className="text-emerald-400" />
                        {t.cancelAnytime || 'Facturación segura vía Stripe. Cancela cuando quieras.'}
                    </span>
                    <div className="flex items-center gap-3 text-slate-500">
                        <span>Visa</span>
                        <span>Mastercard</span>
                        <span>Apple Pay</span>
                        <span>Google Pay</span>
                        <span>SEPA</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PricingModal;
