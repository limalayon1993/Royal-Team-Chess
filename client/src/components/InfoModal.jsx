import React from 'react';
import { X, Info, Mail, Shield, Flame, Activity, Thermometer, Wifi, Rocket } from 'lucide-react';
import { translations } from '../translations';

export function InfoModal({ onClose, language = 'en' }) {
    const t = translations[language];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Info className="text-blue-400" /> {t.infoTitle}
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">{t.infoSubtitle}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-12 text-slate-300 leading-relaxed">

                    {/* Intro / Demo Status */}
                    <section className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
                        <h3 className="text-xl font-bold text-blue-300 mb-2">{t.demoTitle}</h3>
                        <p>
                            {t.demoText}
                        </p>
                        <p className="mt-4 flex items-center gap-2">
                            <Mail size={16} /> {t.feedback}
                            <a href="mailto:limalayon1993@gmail.com" className="text-blue-400 hover:underline font-bold">limalayon1993@gmail.com</a>
                        </p>
                    </section>

                    {/* How to Play (New) */}
                    <section>
                        <h3 className="text-2xl font-bold text-white mb-6 border-b border-slate-700 pb-2">{t.howToPlay}</h3>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-bold text-lg text-indigo-400">{t.createGame}</h4>
                                <p className="text-sm">
                                    {t.createGameText}
                                </p>
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-indigo-400">{t.joinGame}</h4>
                                <p className="text-sm">
                                    {t.joinGameText}
                                </p>
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-indigo-400">{t.configuration}</h4>
                                <p className="text-sm">
                                    {t.configText}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Online Guide (New) */}
                    <section>
                        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                            <h3 className="text-xl font-bold text-blue-400 mb-2 flex items-center gap-2">
                                <Wifi size={20} /> {t.howToPlayMultiplayer}
                            </h3>
                            <p className="text-slate-300 mb-4 text-sm">
                                {t.multiplayerIntro}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-900/50 p-3 rounded border border-slate-700/50">
                                    <h4 className="font-bold text-green-400 mb-2 text-sm">{t.hostRole}</h4>
                                    <p className="text-xs text-slate-400 whitespace-pre-line leading-relaxed">
                                        {t.hostInstructions}
                                    </p>
                                </div>
                                <div className="bg-slate-900/50 p-3 rounded border border-slate-700/50">
                                    <h4 className="font-bold text-yellow-400 mb-2 text-sm">{t.guestRole}</h4>
                                    <p className="text-xs text-slate-400 whitespace-pre-line leading-relaxed">
                                        {t.guestInstructions}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 p-2 bg-blue-900/20 border border-blue-500/30 rounded text-xs text-blue-300 italic">
                                {t.vpnNote}
                            </div>
                        </div>
                    </section>

                    {/* How it Works (Current) */}
                    <section>
                        <h3 className="text-2xl font-bold text-white mb-6 border-b border-slate-700 pb-2">{t.features}</h3>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="font-bold text-lg text-emerald-400 mb-2">{t.teamClock}</h4>
                                <p className="text-sm mb-4">
                                    {t.teamClockText}
                                </p>

                                <h4 className="font-bold text-lg text-emerald-400 mb-2">{t.communication}</h4>
                                <p className="text-sm">
                                    {t.commText}
                                </p>
                            </div>

                            <div>
                                <h4 className="font-bold text-lg text-emerald-400 mb-2">{t.visualizers}</h4>
                                <ul className="space-y-3 text-sm">
                                    <li className="flex gap-2">
                                        <Activity className="text-blue-400 shrink-0" size={18} />
                                        <span><strong>{t.heatmap}</strong></span>
                                    </li>
                                    <li className="flex gap-2">
                                        <Thermometer className="text-red-400 shrink-0" size={18} />
                                        <span><strong>{t.thermometer}</strong></span>
                                    </li>
                                    <li className="flex gap-2">
                                        <Flame className="text-orange-400 shrink-0" size={18} />
                                        <span><strong>{t.burnRate}</strong></span>
                                    </li>
                                    <li className="flex gap-2">
                                        <Shield className="text-green-400 shrink-0" size={18} />
                                        <span><strong>{t.kingSafety}</strong></span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Future Vision (New Marketing Copy) */}
                    <section className="space-y-8">
                        <div className="border-b border-slate-700 pb-4">
                            <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center gap-2">
                                <Rocket size={32} /> {t.futureTitle}
                            </h3>
                            <p className="text-slate-400 italic mt-2 text-lg">
                                {t.futureQuote}
                            </p>
                        </div>

                        <div className="space-y-8 text-slate-300">
                            <p className="text-lg leading-relaxed">
                                {t.futureIntro}
                            </p>

                            <div>
                                <h4 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    {t.sportTitle}
                                </h4>
                                <p className="mb-4">
                                    {t.sportText}
                                </p>
                                <ul className="space-y-4 pl-4 border-l-2 border-indigo-500/30">
                                    <li>
                                        <strong className="text-indigo-400 block mb-1">{t.jointClock}</strong>
                                        {t.jointClockDesc}
                                    </li>
                                    <li>
                                        <strong className="text-indigo-400 block mb-1">{t.totalComm}</strong>
                                        {t.totalCommDesc}
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    {t.commandCenter}
                                </h4>
                                <p className="mb-4">
                                    {t.commandCenterText}
                                </p>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-slate-800/50 p-4 rounded border border-slate-700/50">
                                        <strong className="text-blue-400 block mb-1">{t.heatmap}</strong>
                                        {t.heatmapDesc}
                                    </div>
                                    <div className="bg-slate-800/50 p-4 rounded border border-slate-700/50">
                                        <strong className="text-red-400 block mb-1">{t.thermometer}</strong>
                                        {t.thermoDesc}
                                    </div>
                                    <div className="bg-slate-800/50 p-4 rounded border border-slate-700/50 md:col-span-2">
                                        <strong className="text-orange-400 block mb-1">{t.burnRate}</strong>
                                        {t.burnRateDesc}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    {t.competition}
                                </h4>
                                <p className="mb-4">
                                    {t.competitionText}
                                </p>
                                <ul className="list-disc pl-5 space-y-2 text-slate-300">
                                    <li>{t.dynamicMatches}</li>
                                    <li>{t.proCareer}</li>
                                    <li>{t.spectacle}</li>
                                </ul>
                            </div>

                            <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 p-6 rounded-lg border border-indigo-500/20">
                                <h4 className="text-xl font-bold text-white mb-2">{t.futureRoadmap}</h4>
                                <p className="mb-4">
                                    {t.futureRoadmapText}
                                </p>
                                <p className="text-center font-bold text-lg text-indigo-300 mt-6 whitespace-pre-line">
                                    {t.futureOutro}
                                </p>
                            </div>
                        </div>
                    </section>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-700 bg-slate-800/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-colors"
                    >
                        {t.understood}
                    </button>
                </div>
            </div>
        </div>
    );
}
