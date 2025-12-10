import React, { useState } from 'react';
import { X, Send, UserPlus } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { translations } from '../translations';

export function FriendRequestModal({ isOpen, onClose, currentUser, targetUser, language }) {
    if (!isOpen || !targetUser) return null;

    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const t = translations[language];

    const handleSend = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Send the message with type 'friend_request'
            const { error } = await supabase
                .from('messages')
                .insert([{
                    sender_id: currentUser.id,
                    receiver_id: targetUser.id,
                    content: message.trim() || t.requestMessagePlaceholder, // Default message if empty
                    type: 'friend_request',
                    metadata: { status: 'pending' }
                }]);

            if (error) {
                console.error('Error sending request:', error);
                alert('Error sending request');
            } else {
                alert(t.friendRequestSent || "Friend request sent!");
                onClose();
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
            setMessage('');
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/30">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <UserPlus className="text-blue-500" /> {t.sendFriendRequest || "Send Friend Request"}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-6 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                        <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white overflow-hidden shrink-0">
                            {targetUser.avatar_url ? (
                                <img src={targetUser.avatar_url} alt={targetUser.username} className="w-full h-full object-cover" />
                            ) : (
                                targetUser.username?.substring(0, 2).toUpperCase()
                            )}
                        </div>
                        <div>
                            <p className="text-sm text-slate-400 uppercase font-bold text-[10px] tracking-wider">Sending to</p>
                            <p className="text-lg font-bold text-white">{targetUser.username}</p>
                        </div>
                    </div>

                    <form onSubmit={handleSend}>
                        <label className="block text-sm font-bold text-slate-400 mb-2">Message</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={t.requestMessagePlaceholder || "Hello..."}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 min-h-[100px] mb-6 resize-none"
                        />

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all hover:scale-105 shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
                            >
                                {loading ? 'Sending...' : (
                                    <>
                                        <Send size={18} /> {t.sendRequest || "Send Request"}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
