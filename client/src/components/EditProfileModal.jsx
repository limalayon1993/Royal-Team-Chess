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
            // 1. Delete Messages
            await supabase.from('messages').delete().or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

            // 2. Delete Profile (This frees up the Username)
            const { error } = await supabase.from('profiles').delete().eq('id', user.id);

            if (error) throw error;

            // 3. Sign Out
            await signOut();

            // Note: Use 'auth.users' deletion requires Admin API or manual deletion in Dashboard.
            // But this effectively "resets" their public data.
            alert('Your profile data has been deleted. (Note: Only Supabase Admin can delete the login email completely)');
            window.location.href = '/';
        } catch (error) {
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
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
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
                                <Trash2 size={18} /> Delete Data
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
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-500 mb-2">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-white">Are you sure?</h3>
                        <p className="text-slate-400 text-sm">
                            This will delete your public profile, stats, and chat history.
                            <br />
                            <span className="text-red-400 font-bold mt-2 block">
                                IMPORTANT: This does NOT delete your Email login from Supabase Auth (security restriction). You must do that in the Supabase Dashboard.
                            </span>
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
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-900/30"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
