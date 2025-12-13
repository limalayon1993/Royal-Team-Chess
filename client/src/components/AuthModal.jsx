
import React, { useState } from 'react';
import { X, Mail, Lock, User, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { translations } from '../translations';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export function AuthModal({ onClose, language = 'en', initialView = 'login' }) {
    const t = translations[language];
    const { signIn, signUp, resetPassword, updatePassword } = useAuth();
    const [view, setView] = useState(initialView); // 'options', 'login', 'register', 'forgotPassword', 'updatePassword'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        username: ''
    });



    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (view === 'login') {
                await signIn(formData.email, formData.password);
                onClose();
            } else if (view === 'register') {
                await signUp(formData.email, formData.password, formData.username);
                alert("Account created! You can now sign in.");
                setView('login');
            } else if (view === 'forgotPassword') {
                await resetPassword(formData.email);
                setError('success'); // Use error state to show success message
            } else if (view === 'updatePassword') {
                await updatePassword(formData.password);
                onClose();
                alert('Password updated successfully!');
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Resend Email Logic
    const handleResendEmail = async () => {
        setLoading(true);
        try {
            await supabase.auth.resend({
                type: 'signup',
                email: formData.email,
            });
            alert('Confirmation email resent! Check your inbox (and spam).');
        } catch (error) {
            console.error(error);
            alert('Error resending email: ' + error.message);
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-lg p-8 relative animate-fade-in">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
                >
                    <X size={24} />
                </button>



                {/* LOGIN / REGISTER / FORGOT PASSWORD / UPDATE PASSWORD VIEW */}
                {(view === 'login' || view === 'register' || view === 'forgotPassword' || view === 'updatePassword') && (
                    <>


                        <div className="flex flex-col items-center mb-6 mt-2">
                            <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400 mb-3">
                                {view === 'login' ? <LogIn size={32} /> :
                                    view === 'register' ? <UserPlus size={32} /> :
                                        view === 'updatePassword' ? <Lock size={32} /> :
                                            <Mail size={32} />}
                            </div>
                            <h2 className="text-2xl font-bold text-white">
                                {view === 'login' ? (t.loginTitle || 'Welcome Back') :
                                    view === 'register' ? (t.registerTitle || 'Create Account') :
                                        view === 'updatePassword' ? (t.updatePasswordTitle || 'Set New Password') :
                                            (t.resetPasswordTitle || 'Reset Password')}
                            </h2>
                            <p className="text-slate-400 text-sm mt-1 text-center">
                                {view === 'login' ? (t.loginSubtitle || 'Sign in to continue') :
                                    view === 'register' ? (t.registerSubtitle || 'Join the Royal Team Chess community') :
                                        (t.resetPasswordSubtitle || 'Enter your email to receive a reset link')}
                            </p>
                        </div>

                        {view === 'forgotPassword' && error === 'success' ? (
                            <div className="text-center space-y-4">
                                <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200">
                                    {t.checkEmail || "Check your email for the reset link"}
                                </div>
                                <button
                                    onClick={() => {
                                        setView('login');
                                        setError(null);
                                    }}
                                    className="text-blue-400 hover:text-blue-300 underline"
                                >
                                    {t.backToLogin || "Back to Login"}
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {view === 'register' && (
                                    <div>
                                        <label className="block text-sm font-bold text-slate-400 mb-1">
                                            {t.username || 'Username'}
                                        </label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                            <input
                                                type="text"
                                                required
                                                className="input-field w-full !pl-12"
                                                value={formData.username}
                                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                                placeholder="Grandmaster123"
                                            />
                                        </div>
                                    </div>
                                )}

                                {(view === 'forgotPassword' || view === 'login' || view === 'register' || view === 'resetAccount') && (
                                    <div>
                                        <label className="block text-sm font-bold text-slate-400 mb-1">
                                            {t.email || 'Email'}
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                            <input
                                                type="email"
                                                required
                                                className="input-field w-full !pl-12"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="name@example.com"
                                            />
                                        </div>
                                    </div>
                                )}

                                {(view === 'login' || view === 'register' || view === 'updatePassword') && (
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-sm font-bold text-slate-400">
                                                {view === 'updatePassword' ? (t.newPassword || 'New Password') : (t.password || 'Password')}
                                            </label>
                                            {view === 'login' && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setView('forgotPassword');
                                                        setError(null);
                                                    }}
                                                    className="text-xs text-blue-400 hover:text-blue-300"
                                                >
                                                    {t.forgotPassword || "Forgot Password?"}
                                                </button>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                            <input
                                                type="password"
                                                required
                                                minLength={6}
                                                className="input-field w-full !pl-12"
                                                value={formData.password}
                                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                )}

                                {error && error !== 'success' && (
                                    <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-200 text-sm">
                                        <AlertCircle size={16} className="shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <span className="animate-pulse">Loading...</span>
                                    ) : (
                                        <>
                                            {view === 'login' ? <LogIn size={18} /> :
                                                view === 'register' ? <UserPlus size={18} /> :
                                                    view === 'updatePassword' ? <Lock size={18} /> :
                                                        <Mail size={18} />}
                                            {view === 'login' ? (t.login || 'Sign In') :
                                                view === 'register' ? (t.register || 'Sign Up') :
                                                    view === 'updatePassword' ? (t.updatePassword || 'Update Password') :
                                                        (t.sendResetLink || 'Send Reset Link')}
                                        </>
                                    )}
                                </button>


                            </form>
                        )}

                        {view !== 'forgotPassword' && view !== 'updatePassword' && (
                            <div className="mt-6 text-center">
                                <button
                                    onClick={() => {
                                        setView(view === 'login' ? 'register' : 'login');
                                        setError(null);
                                    }}
                                    className="text-slate-400 hover:text-white text-sm underline transition-colors"
                                >
                                    {view === 'login'
                                        ? (t.noAccount || "Don't have an account? Sign up")
                                        : (t.hasAccount || "Already have an account? Sign in")}
                                </button>
                            </div>
                        )}

                        {view === 'forgotPassword' && error !== 'success' && (
                            <div className="mt-6 text-center">
                                <button
                                    onClick={() => {
                                        setView('login');
                                        setError(null);
                                    }}
                                    className="text-slate-400 hover:text-white text-sm underline transition-colors"
                                >
                                    {t.backToLogin || "Back to Login"}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
