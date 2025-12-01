import React, { useState } from 'react';
import { X, Mail, Copy, Check } from 'lucide-react';
import { translations } from '../translations';

export function ContactModal({ onClose, language = 'en' }) {
    const t = translations[language];
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText('contact@royalteamchess.com');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-md relative animate-fade-in">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400">
                        <Mail size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-white">{t.contactTitle}</h2>
                </div>

                <div className="text-center py-8 space-y-6">
                    <p className="text-slate-300 text-lg">
                        {language === 'es'
                            ? 'Si tienes alguna duda o sugerencia, escríbenos a:'
                            : 'If you have any questions or suggestions, please email us at:'}
                    </p>

                    <button
                        onClick={handleCopy}
                        className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all group border border-slate-700 hover:border-blue-500/50 cursor-pointer"
                    >
                        {copied ? (
                            <Check className="text-green-400" />
                        ) : (
                            <Copy className="text-blue-400 group-hover:scale-110 transition-transform" />
                        )}
                        <span className={`text-xl font-mono transition-colors ${copied ? 'text-green-400 font-bold' : 'text-white'}`}>
                            {copied
                                ? (language === 'es' ? '¡Copiado!' : 'Copied!')
                                : 'contact@royalteamchess.com'}
                        </span>
                    </button>

                    <p className="text-slate-500 text-sm">
                        {language === 'es'
                            ? 'Haz clic para copiar el correo.'
                            : 'Click to copy email address.'}
                    </p>
                </div>
            </div>
        </div>
    );
}
