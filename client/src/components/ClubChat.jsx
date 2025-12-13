import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Loader } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { translations } from '../translations';

export function ClubChat({ clubId, user, language = 'en' }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const t = translations[language];

    const scrollToBottom = () => {
        setTimeout(() => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
            }
        }, 100);
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!clubId) return;

        // Fetch initial messages
        const fetchMessages = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('club_messages')
                .select('*, sender:sender_id(username, avatar_url)')
                .eq('club_id', clubId)
                .order('created_at', { ascending: true })
                .limit(100);

            if (error) {
                console.error('Error fetching club messages:', error);
            } else {
                setMessages(data);
            }
            setLoading(false);
        };

        fetchMessages();

        // Subscribe to real-time changes
        const subscription = supabase
            .channel(`club_chat:${clubId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'club_messages',
                filter: `club_id=eq.${clubId}`,
            }, async (payload) => {
                // Determine if we need to fetch sender info (if it's not included in payload)
                // Payload only has the new row data. We need to fetch the sender details.
                const { data: senderData, error } = await supabase
                    .from('profiles')
                    .select('username, avatar_url')
                    .eq('id', payload.new.sender_id)
                    .single();

                if (!error && senderData) {
                    const newMsg = {
                        ...payload.new,
                        sender: senderData
                    };
                    setMessages(prev => [...prev, newMsg]);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [clubId]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        const content = newMessage.trim();
        setNewMessage(''); // Clear input immediately

        // Optimistic update (optional, but waiting for DB is safer for consistency with join)
        // Let's rely on the subscription for the update to ensure data consistency, 
        // OR we can optimistically append if we trust the sending. 
        // Subscription is fast enough usually.

        const { error } = await supabase
            .from('club_messages')
            .insert([{
                club_id: clubId,
                sender_id: user.id,
                content: content
            }]);

        if (error) {
            console.error('Error sending message:', error);
            alert(t.sendFailed);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 py-10">
                <Loader className="animate-spin mb-2" />
                <p>{t.loadingChat}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[500px] bg-slate-800/20 border border-slate-700/50 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-700/50 bg-slate-800/40 backdrop-blur-sm flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                    <MessageSquare className="text-purple-400" /> {t.clubChat}
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                    {messages.length} {t.messagesLower}
                </span>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 italic opacity-60">
                        <MessageSquare size={48} className="mb-2" />
                        <p>{t.noMessages}</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = user && msg.sender_id === user.id;
                        const showHeader = idx === 0 || messages[idx - 1].sender_id !== msg.sender_id;

                        return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                {showHeader && !isMe && (
                                    <span className="text-xs text-slate-400 mb-1 ml-2 font-bold">
                                        {msg.sender?.username || t.unknown}
                                    </span>
                                )}

                                <div className={`flex items-end gap-2 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {/* Avatar (only show for others) */}
                                    {!isMe && showHeader ? (
                                        <div className="w-6 h-6 rounded-full bg-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-600">
                                            {msg.sender?.avatar_url ? (
                                                <img src={msg.sender.avatar_url} alt={msg.sender.username} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-[10px] font-bold text-slate-300">
                                                    {(msg.sender?.username || '?').substring(0, 1).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        !isMe && <div className="w-6" /> // Spacer
                                    )}

                                    <div
                                        className={`px-4 py-2 rounded-2xl text-sm break-words shadow-sm ${isMe
                                            ? 'bg-purple-600 text-white rounded-tr-none'
                                            : 'bg-slate-700 text-slate-200 rounded-tl-none'
                                            }`}
                                    >
                                        {msg.content}
                                    </div>
                                </div>

                                <span className={`text-[9px] text-slate-600 mt-1 ${isMe ? 'mr-1' : 'ml-10'}`}>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-800/50 border-t border-slate-700/50">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={t.chatPlaceholder}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-slate-600"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all shadow-lg shadow-purple-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
}
