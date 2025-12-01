import React, { useState } from 'react';
import { X, Send, Mail } from 'lucide-react';
import { translations } from '../translations';

export function ContactModal({ onClose, language = 'en' }) {
    const t = translations[language];
    const [formData, setFormData] = useState({
        email: '',
        subject: '',
        message: ''
    });
    const [status, setStatus] = useState('idle'); // idle, sending, success, error

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('sending');

        // Simulate API call for now
        // In a real app, this would POST to /api/contact
        try {
            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            // For now, we'll just log it. 
            // To actually send email, we'd need a backend endpoint with Nodemailer
            console.log('Contact Form Data:', formData);

            // Construct mailto link as a fallback/immediate solution if backend isn't ready
            const mailtoLink = `mailto:contact@royalteamchess.com?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(`From: ${formData.email}\n\n${formData.message}`)}`;
            window.location.href = mailtoLink;

            setStatus('success');
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (error) {
            console.error('Error sending message:', error);
            setStatus('error');
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

                {status === 'success' ? (
                    <div className="text-center py-8 text-green-400 animate-fade-in">
                        <div className="flex justify-center mb-4">
                            <div className="p-4 bg-green-500/20 rounded-full">
                                <Send size={32} />
                            </div>
                        </div>
                        <p className="text-xl font-bold">{t.sentSuccess}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-1">
                                {t.email}
                            </label>
                            <input
                                type="email"
                                required
                                className="input-field w-full"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="name@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-1">
                                {t.subject}
                            </label>
                            <input
                                type="text"
                                required
                                className="input-field w-full"
                                value={formData.subject}
                                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                placeholder={t.subject}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-1">
                                {t.message}
                            </label>
                            <textarea
                                required
                                rows={4}
                                className="input-field w-full resize-none"
                                value={formData.message}
                                onChange={e => setFormData({ ...formData, message: e.target.value })}
                                placeholder={t.message}
                            />
                        </div>

                        {status === 'error' && (
                            <p className="text-red-400 text-sm text-center">{t.sentError}</p>
                        )}

                        <button
                            type="submit"
                            disabled={status === 'sending'}
                            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                        >
                            {status === 'sending' ? (
                                <span className="animate-pulse">{t.sending}</span>
                            ) : (
                                <>
                                    <Send size={18} />
                                    {t.send}
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
