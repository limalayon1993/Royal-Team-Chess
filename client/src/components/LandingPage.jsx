import React from 'react';
import { Crown, Users, Activity, Shield, Flame, Thermometer, Play, LogIn, Globe, MessageSquare, Trophy, Target, Zap, Mail } from 'lucide-react';
import { translations } from '../translations';
import { ContactModal } from './ContactModal';

export function LandingPage({ onPlayAsGuest, onLogin, language, toggleLanguage }) {
    const t = translations[language];
    const [showContact, setShowContact] = React.useState(false);

    return (
        <div className="min-h-screen bg-slate-900 text-white overflow-y-auto font-sans">
            {showContact && <ContactModal onClose={() => setShowContact(false)} language={language} />}
            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Crown className="text-yellow-400" size={28} strokeWidth={2.5} />
                        <div className="absolute inset-0 bg-yellow-400/20 blur-lg rounded-full"></div>
                    </div>
                    <span className="text-xl font-black tracking-tight bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                        ROYAL TEAM CHESS
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowContact(true)}
                        className="flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider"
                    >
                        <Mail size={16} />
                        {t.contact}
                    </button>
                    <button
                        onClick={toggleLanguage}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors text-xs font-bold text-slate-300 hover:text-white uppercase tracking-wider"
                    >
                        <Globe size={14} />
                        {language === 'en' ? 'ES' : 'EN'}
                    </button>
                    <button
                        onClick={onLogin}
                        className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
                    >
                        <LogIn size={16} /> Login
                    </button>
                    <button
                        onClick={onPlayAsGuest}
                        className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5"
                    >
                        <Play size={16} fill="currentColor" /> {t.playNow || "PLAY NOW"}
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative py-24 px-6 text-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900 z-0 pointer-events-none" />
                <div className="relative z-10 max-w-5xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-300 text-xs font-bold mb-8 uppercase tracking-widest animate-fade-in-up">
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                        {t.betaAccess || "Public Beta Live"}
                    </div>
                    <h1 className="text-5xl md:text-8xl font-black mb-8 tracking-tight leading-tight">
                        <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                            {t.heroTitle1 || "Chess is now a"}
                        </span>
                        <br />
                        <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent drop-shadow-2xl">
                            {t.heroTitle2 || "Team Sport."}
                        </span>
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
                        {t.heroSubtitle || "Coordinate with a shared clock. Analyze real-time data. Dominate the board together without seeing your partner's moves."}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <button
                            onClick={onPlayAsGuest}
                            className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl font-bold text-xl transition-all transform hover:scale-105 shadow-2xl shadow-blue-900/50 flex items-center justify-center gap-3 border border-blue-400/20"
                        >
                            <Play size={24} fill="currentColor" /> {t.playAsGuest || "PLAY AS GUEST"}
                        </button>
                        <button
                            onClick={onLogin}
                            className="w-full sm:w-auto px-10 py-5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl font-bold text-xl transition-all flex items-center justify-center gap-3 backdrop-blur-sm"
                        >
                            <LogIn size={24} /> Login
                        </button>
                    </div>
                </div>
            </header>

            {/* Core Features Grid */}
            <section className="py-20 px-6 bg-slate-800/30 border-y border-slate-800/50">
                <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
                    {/* Feature 1 */}
                    <div className="group bg-slate-900/50 p-8 rounded-2xl border border-slate-700/50 hover:border-blue-500/50 transition-all hover:bg-slate-900/80 hover:shadow-xl hover:shadow-blue-900/10">
                        <div className="w-14 h-14 bg-blue-900/20 rounded-xl flex items-center justify-center mb-6 text-blue-400 group-hover:scale-110 transition-transform">
                            <Users size={32} />
                        </div>
                        <h3 className="text-2xl font-bold mb-3 text-white">{t.teamClock || "Shared Team Clock"}</h3>
                        <p className="text-slate-400 leading-relaxed">
                            {t.teamClockDesc || "Time is your most valuable resource. You and your teammate share a single timer. Move fast to save time for your partner's critical moments."}
                        </p>
                    </div>

                    {/* Feature 2 */}
                    <div className="group bg-slate-900/50 p-8 rounded-2xl border border-slate-700/50 hover:border-purple-500/50 transition-all hover:bg-slate-900/80 hover:shadow-xl hover:shadow-purple-900/10">
                        <div className="w-14 h-14 bg-purple-900/20 rounded-xl flex items-center justify-center mb-6 text-purple-400 group-hover:scale-110 transition-transform">
                            <Activity size={32} />
                        </div>
                        <h3 className="text-2xl font-bold mb-3 text-white">{t.visualizers || "Data Visualizers"}</h3>
                        <p className="text-slate-400 leading-relaxed">
                            {t.visualizerDesc || "You can't see your partner's board, but you can see their war. Use Heatmaps, Thermometers, and Burn Rates to understand the flow of battle."}
                        </p>
                    </div>

                    {/* Feature 3 (Updated) */}
                    <div className="group bg-slate-900/50 p-8 rounded-2xl border border-slate-700/50 hover:border-green-500/50 transition-all hover:bg-slate-900/80 hover:shadow-xl hover:shadow-green-900/10">
                        <div className="w-14 h-14 bg-green-900/20 rounded-xl flex items-center justify-center mb-6 text-green-400 group-hover:scale-110 transition-transform">
                            <MessageSquare size={32} />
                        </div>
                        <h3 className="text-2xl font-bold mb-3 text-white">{t.communication || "Strategic Comms"}</h3>
                        <p className="text-slate-400 leading-relaxed">
                            {t.commDesc || "Communication is key, but spoilers are forbidden. Discuss strategy and timing, but never reveal specific moves. Trust your teammate to execute the plan."}
                        </p>
                    </div>
                </div>
            </section>

            {/* Deep Dive: How to Play */}
            <section className="py-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black mb-6">{t.howToPlay || "Master the Interface"}</h2>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                            {t.howToPlaySubtitle || "Understanding the visualizers is the difference between victory and defeat."}
                        </p>
                    </div>

                    <div className="grid gap-12">
                        {/* Thermometer */}
                        <div className="flex flex-col md:flex-row gap-8 items-center bg-slate-800/20 p-8 rounded-3xl border border-slate-700/50">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-red-900/30 rounded-lg text-red-400"><Thermometer size={24} /></div>
                                    <h3 className="text-2xl font-bold text-white">{t.thermometer || "The Thermometer"}</h3>
                                </div>
                                <p className="text-slate-300 text-lg leading-relaxed mb-4">
                                    {t.thermoExplain || "The classic advantage meter. It shows who is winning based on material and positional analysis."}
                                </p>
                                <ul className="space-y-2 text-slate-400">
                                    <li className="flex items-center gap-2"><div className="w-2 h-2 bg-white rounded-full"></div> {t.thermoWhite || "White Bar = White Control"}</li>
                                    <li className="flex items-center gap-2"><div className="w-2 h-2 bg-slate-500 rounded-full"></div> {t.thermoBlack || "Black Bar = Black Control"}</li>
                                </ul>
                            </div>
                            <div className="flex-1 flex justify-center">
                                {/* Visual Mockup */}
                                <div className="w-16 h-64 bg-slate-800 rounded-full border-4 border-slate-700 relative overflow-hidden shadow-2xl">
                                    <div className="absolute bottom-0 w-full h-[60%] bg-white transition-all duration-1000"></div>
                                    <div className="absolute top-0 w-full h-[40%] bg-slate-900"></div>
                                </div>
                            </div>
                        </div>

                        {/* Heatmap */}
                        <div className="flex flex-col md:flex-row-reverse gap-8 items-center bg-slate-800/20 p-8 rounded-3xl border border-slate-700/50">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-blue-900/30 rounded-lg text-blue-400"><Activity size={24} /></div>
                                    <h3 className="text-2xl font-bold text-white">{t.heatmap || "The Heatmap"}</h3>
                                </div>
                                <p className="text-slate-300 text-lg leading-relaxed mb-4">
                                    {t.heatmapExplain || "See board control at a glance. Each square's color tells you who owns that territory."}
                                </p>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="flex items-center gap-2 text-blue-300"><span className="w-3 h-3 bg-blue-500 rounded"></span> {t.whiteControl || "White Control"}</div>
                                    <div className="flex items-center gap-2 text-red-300"><span className="w-3 h-3 bg-red-500 rounded"></span> {t.blackControl || "Black Control"}</div>
                                    <div className="flex items-center gap-2 text-yellow-300"><span className="w-3 h-3 bg-yellow-500 rounded"></span> {t.contestedTie || "Contested (Tie)"}</div>
                                    <div className="flex items-center gap-2 text-purple-300"><span className="w-3 h-3 bg-purple-500 rounded"></span> {t.complexBattle || "Complex Battle"}</div>
                                </div>
                            </div>
                            <div className="flex-1 flex justify-center">
                                {/* Visual Mockup */}
                                <div className="grid grid-cols-4 gap-1 p-2 bg-slate-800 rounded-lg shadow-2xl">
                                    {[...Array(16)].map((_, i) => (
                                        <div key={i} className={`w-10 h-10 rounded ${i === 0 ? 'bg-blue-500' : i === 5 ? 'bg-red-500' : i === 10 ? 'bg-yellow-500' : i === 15 ? 'bg-purple-500' : 'bg-slate-700/30'
                                            }`}></div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Burn Rate & King Safety */}
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-slate-800/20 p-8 rounded-3xl border border-slate-700/50">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-orange-900/30 rounded-lg text-orange-400"><Flame size={24} /></div>
                                    <h3 className="text-xl font-bold text-white">{t.burnRate || "Time Burn"}</h3>
                                </div>
                                <p className="text-slate-400 mb-4">
                                    {t.burnExplain || "Tracks time usage intensity. If the flame turns RED, your teammate is burning time faster than the team average. Tell them to hurry up!"}
                                </p>
                            </div>
                            <div className="bg-slate-800/20 p-8 rounded-3xl border border-slate-700/50">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-green-900/30 rounded-lg text-green-400"><Shield size={24} /></div>
                                    <h3 className="text-xl font-bold text-white">{t.kingSafety || "King Safety"}</h3>
                                </div>
                                <ul className="space-y-3 text-sm text-slate-300">
                                    <li className="flex items-center gap-3"><Shield size={16} className="text-green-500" /> {t.kingSafe || "Safe"}</li>
                                    <li className="flex items-center gap-3"><Shield size={16} className="text-green-500 drop-shadow-[0_0_3px_rgba(239,68,68,0.8)]" /> {t.kingSurrounded || "Safe but Surrounded"}</li>
                                    <li className="flex items-center gap-3"><Shield size={16} className="text-orange-500" /> {t.kingUnsafe || "Unsafe / Exposed"}</li>
                                    <li className="flex items-center gap-3"><Shield size={16} className="text-red-500 animate-pulse" /> {t.kingDanger || "Under Attack / Check"}</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Future Roadmap */}
            <section className="py-24 px-6 bg-gradient-to-b from-slate-900 to-blue-900/20 border-t border-slate-800">
                <div className="max-w-6xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-black mb-12 flex items-center justify-center gap-3">
                        <Target className="text-blue-500" /> {t.roadmapTitle || "The Future of Royal Team Chess"}
                    </h2>

                    <div className="grid md:grid-cols-3 gap-6 text-left">
                        {/* Match Mode */}
                        <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-700/50 hover:border-blue-500/50 transition-all hover:bg-slate-900/90 group">
                            <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-lg">
                                <Trophy size={20} className="text-yellow-400 group-hover:scale-110 transition-transform" />
                                {t.matchModeTitle || "The 'Match' Mode"}
                            </h4>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                {t.matchModeDesc || "The ultimate competitive experience. 4vs4 battles, 2 halves, substitutions, and bench strategy."}
                            </p>
                        </div>

                        {/* Esports */}
                        <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-700/50 hover:border-yellow-500/30 transition-colors">
                            <h4 className="font-bold text-white mb-2 flex items-center gap-2"><Trophy size={18} className="text-yellow-400" /> {t.esportsTitle || "Esports Revolution"}</h4>
                            <p className="text-slate-400 text-sm">{t.esportsDesc || "Professional leagues played on weekends, live broadcasts, and a complete Esports ecosystem."}</p>
                        </div>

                        {/* Tournaments */}
                        <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-700/50 hover:border-orange-500/30 transition-colors">
                            <h4 className="font-bold text-white mb-2 flex items-center gap-2"><Crown size={18} className="text-orange-400" /> {t.tournamentsTitle || "Official Tournaments"}</h4>
                            <p className="text-slate-400 text-sm">{t.tournamentsDesc || "Regular official tournaments with real prizes, open to all skill levels."}</p>
                        </div>

                        {/* Game Modes */}
                        <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-700/50 hover:border-purple-500/30 transition-colors">
                            <h4 className="font-bold text-white mb-2 flex items-center gap-2"><Zap size={18} className="text-purple-400" /> {t.gameModesTitle || "New Game Modes"}</h4>
                            <p className="text-slate-400 text-sm">{t.gameModesDesc || "Single Game, Match Mode, Knockout, Tournament, and League. Official or community-created."}</p>
                        </div>

                        {/* Clubs */}
                        <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-700/50 hover:border-blue-500/30 transition-colors">
                            <h4 className="font-bold text-white mb-2 flex items-center gap-2"><Users size={18} className="text-blue-400" /> {t.clubsTitle || "Clubs & Teams"}</h4>
                            <p className="text-slate-400 text-sm">{t.clubsDesc || "Create permanent teams, manage rosters, and climb the global team rankings."}</p>
                        </div>

                        {/* Community */}
                        <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-700/50 hover:border-green-500/30 transition-colors">
                            <h4 className="font-bold text-white mb-2 flex items-center gap-2"><Globe size={18} className="text-green-400" /> {t.communityTitle || "Global Community"}</h4>
                            <p className="text-slate-400 text-sm">{t.communityDesc || "Localized events, community-driven features, and international leaderboards."}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-24 px-6 text-center">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-black mb-8 text-white">
                        {t.joinRevolution || "Ready to join the revolution?"}
                    </h2>
                    <button
                        onClick={onPlayAsGuest}
                        className="px-12 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-2xl font-black text-2xl transition-all transform hover:scale-105 shadow-2xl shadow-blue-900/50 flex items-center justify-center gap-4 mx-auto"
                    >
                        <Play size={32} fill="currentColor" /> {t.playNowCaps || "PLAY NOW - IT'S FREE"}
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-slate-800 text-center text-slate-500 text-sm bg-slate-950">
                <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
                    <Crown size={20} />
                    <span className="font-bold">Royal Team Chess</span>
                </div>
                <p>&copy; 2025 Royal Team Chess. All rights reserved.</p>
                <p className="mt-4">
                    <a href="mailto:contact@royalteamchess.com" className="hover:text-blue-400 transition-colors">contact@royalteamchess.com</a>
                </p>
            </footer>
        </div>
    );
}
