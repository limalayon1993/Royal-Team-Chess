import React, { useState } from 'react';
import { X, Save, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export function EditProfileModal({ isOpen, onClose, profile, language }) {
    const { user, signOut } = useAuth();
    const [username, setUsername] = useState(profile?.username || '');
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
    const [loading, setLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    if (!isOpen) return null;

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    username,
                    avatar_url: avatarUrl,
                    updated_at: new Date()
                })
                .eq('id', user.id);

            if (error) throw error;
            onClose();
            // detailed reload or state update would be better here
            window.location.reload();
        } catch (error) {
            alert('Error updating profile: ' + error.message);
        }
        setLoading(false);
    };

    const handleDeleteAccount = async () => {
        setLoading(true);
        try {
            // Determine Server URL (with fallback)
            // FORCE LOCALHOST: If we are on localhost, ignore VITE_SERVER_URL to avoid hitting Prod
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const serverUrl = isLocal ? 'http://localhost:3000' : (import.meta.env.VITE_SERVER_URL || 'http://localhost:3000');

            console.log('[DeleteAccount] Targeting Server URL:', serverUrl);

            const response = await fetch(`${serverUrl}/api/admin/delete-user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user.user_metadata.username || username })
            });

            // Check content type or status before parsing JSON
            const contentType = response.headers.get("content-type");
            if (!response.ok) {
                // Try to read text if possible
                const text = await response.text();
                throw new Error(`Server returned ${response.status}: ${text}`);
            }
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                console.error('[DeleteAccount] Invalid Response (Not JSON):', text.substring(0, 100)); // Log first 100 chars
                // VERBOSE DEBUG ALERT
                alert(`DEBUG ERROR:\nURL: ${serverUrl}/api/admin/delete-user\nStatus: ${response.status}\nContent-Type: ${contentType}\nResponse Start: ${text.substring(0, 50)}...`);
                throw new Error("Server returned non-JSON response. See alert.");
            }

            const result = await response.json();

            if (!result.success) {
                // IDEMPOTENCY CHECK:
                // If the error is "User not found", it means they are ALREADY deleted.
                // We should treat this as success from the client's perspective (cleanup local data).
                if (response.status === 404 || (result.error && result.error.includes('not found'))) {
                    console.warn('[DeleteAccount] User already deleted on server. Proceeding to local cleanup.');
                } else {
                    throw new Error(result.error || 'Server failed to delete user');
                }
            }

            // 3. Sign Out
            // await signOut(); // This might fail if user is already deleted from Auth, but we try.
            // Force clearing local session
            localStorage.clear();
            sessionStorage.clear();

            alert('Your profile has been successfully deleted. Redirecting...');
            window.location.href = '/';
        } catch (error) {
            console.error('[DeleteAccount] Error details:', error);
            alert('Error deleting data: ' + error.message);
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md p-6 rounded-3xl shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white"
                >
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-bold text-white mb-6">Edit Profile</h2>

                {!deleteConfirm ? (
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-1">Username</label>
                            <input
                                type="text"
                                value={username}
                                readOnly
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2 text-slate-400 cursor-not-allowed focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-1">Avatar URL</label>
                            <input
                                type="text"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                            />
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setDeleteConfirm(true)}
                                className="px-4 py-3 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl font-bold transition-all flex items-center gap-2 border border-red-500/20"
                            >
                                <Trash2 size={18} /> Delete Account
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
                            >
                                <Save size={18} /> {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="text-center space-y-4 animate-fade-in">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-500 mb-2">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-white">Delete Account?</h3>
                        <p className="text-slate-400 text-sm">
                            This action cannot be undone. All your data (stats, friends, messages) will be permanently removed.
                        </p>
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setDeleteConfirm(false)}
                                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={loading}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-900/30 flex items-center justify-center"
                            >
                                {loading ? 'Deleting...' : 'Yes, Delete Everything'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
