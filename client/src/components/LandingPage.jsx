import React from 'react';
import { Rocket, Users, Activity, Shield, Flame, Thermometer, Play, LogIn, Globe } from 'lucide-react';
import { translations } from '../translations';

export function LandingPage({ onPlayAsGuest, onLogin, language, toggleLanguage }) {
    const t = translations[language];

    return (
        <div className="min-h-screen bg-slate-900 text-white overflow-y-auto">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Rocket className="text-blue-500" size={24} />
                    <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Royal Team Chess
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleLanguage}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors text-xs font-bold text-slate-300 hover:text-white"
                    >
                        <Globe size={14} />
                        {language === 'en' ? 'ES' : 'EN'}
                    </button>
                    <button
                        onClick={onLogin}
                        className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-300 hover:text-white transition-colors"
                    >
                        <LogIn size={16} /> Login
                    </button>
                    <button
                        onClick={onPlayAsGuest}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition-colors shadow-lg shadow-blue-900/20"
                    >
                        <Play size={16} /> {t.playNow || "Play Now"}
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative py-20 px-6 text-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-slate-900 z-0 pointer-events-none" />
                <div className="relative z-10 max-w-4xl mx-auto">
                    <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
                        <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                            Team Chess
                        </span>
                        <br />
                        Reinvented.
                    </h1>
                    <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                        {t.futureQuote || "Experience the future of chess with shared team clocks, real-time strategy, and advanced data visualization."}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={onPlayAsGuest}
                            className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-xl shadow-blue-900/30 flex items-center justify-center gap-2"
                        >
                            <Play size={20} /> {t.playAsGuest || "Play as Guest"}
                        </button>
                        <button
                            onClick={onLogin}
                            className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
                        >
                            <LogIn size={20} /> Login
                        </button>
                    </div>
                </div>
            </header>

            {/* Features Grid */}
            <section className="py-16 px-6 bg-slate-800/30">
                <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
                    <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700/50 hover:border-blue-500/30 transition-colors">
                        <div className="w-12 h-12 bg-blue-900/30 rounded-lg flex items-center justify-center mb-4 text-blue-400">
                            <Users size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-white">{t.teamClock || "Shared Team Clock"}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            {t.teamClockText || "Your team shares a single clock. Coordinate moves to manage time efficiently."}
                        </p>
                    </div>
                    <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700/50 hover:border-purple-500/30 transition-colors">
                        <div className="w-12 h-12 bg-purple-900/30 rounded-lg flex items-center justify-center mb-4 text-purple-400">
                            <Activity size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-white">{t.visualizers || "Data Visualizers"}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            {t.visualizerIntro || "See your teammates' status without seeing their board. Heatmaps, Thermometers, and more."}
                        </p>
                    </div>
                    <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700/50 hover:border-green-500/30 transition-colors">
                        <div className="w-12 h-12 bg-green-900/30 rounded-lg flex items-center justify-center mb-4 text-green-400">
                            <Shield size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-white">{t.kingSafety || "Strategic Depth"}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            {t.commText || "Voice chat and real-time strategy make this more than just chess. It's a team sport."}
                        </p>
                    </div>
                </div>
            </section>

            {/* How to Play */}
            <section className="py-16 px-6">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold mb-12 text-center">{t.howToPlay || "How to Play"}</h2>

                    <div className="space-y-12">
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-indigo-400 mb-2">{t.createGame || "1. Create or Join"}</h3>
                                <p className="text-slate-300 leading-relaxed">
                                    {t.createGameText || "Start a new room and share the code, or join an existing one. Pick your team (White or Black)."}
                                </p>
                            </div>
                            <div className="flex-1 bg-slate-800 p-4 rounded-lg border border-slate-700">
                                <div className="text-xs font-mono text-slate-500 mb-2">LOBBY PREVIEW</div>
                                <div className="flex gap-2 mb-2">
                                    <div className="flex-1 bg-blue-900/20 border border-blue-500/30 p-2 rounded text-center text-blue-300 text-xs font-bold">TEAM WHITE</div>
                                    <div className="flex-1 bg-red-900/20 border border-red-500/30 p-2 rounded text-center text-red-300 text-xs font-bold">TEAM BLACK</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row-reverse gap-8 items-start">
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-indigo-400 mb-2">{t.visualizers || "2. The Visualizer"}</h3>
                                <p className="text-slate-300 leading-relaxed mb-4">
                                    {t.visualizerDesc || "You can't see your teammate's board, but you can see their data:"}
                                </p>
                                <ul className="space-y-2 text-sm text-slate-400">
                                    <li className="flex items-center gap-2"><Activity size={16} className="text-blue-400" /> <strong>Heatmap:</strong> Control of the board</li>
                                    <li className="flex items-center gap-2"><Thermometer size={16} className="text-red-400" /> <strong>Thermometer:</strong> Advantage meter</li>
                                    <li className="flex items-center gap-2"><Flame size={16} className="text-orange-400" /> <strong>Burn Rate:</strong> Time usage intensity</li>
                                </ul>
                            </div>
                            <div className="flex-1 bg-slate-800 p-4 rounded-lg border border-slate-700 flex items-center justify-center">
                                <div className="grid grid-cols-4 gap-1 opacity-75">
                                    {[...Array(16)].map((_, i) => (
                                        <div key={i} className={`w-8 h-8 rounded ${i % 3 === 0 ? 'bg-blue-500/40' : 'bg-slate-700/50'}`}></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 border-t border-slate-800 text-center text-slate-500 text-sm">
                <p>&copy; 2025 Royal Team Chess. All rights reserved.</p>
                <p className="mt-2">
                    <a href="mailto:contact@royalteamchess.com" className="hover:text-blue-400 transition-colors">contact@royalteamchess.com</a>
                </p>
            </footer>
        </div>
    );
}
