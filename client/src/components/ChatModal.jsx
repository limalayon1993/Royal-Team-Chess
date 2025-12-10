import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Trash2, Search, MessageSquare, UserPlus, Gamepad2, Check } from 'lucide-react';
import { supabase } from '../supabaseClient';

import { translations } from '../translations';

export function ChatModal({ isOpen, onClose, language, currentUser, initialChatUser, onJoinParty, onAcceptProposal, party }) {
    console.log('[ChatModal] MOUNTED. isOpen:', isOpen, 'User:', currentUser?.id);
    if (!isOpen) return null;

    const t = translations[language];

    const [activeChat, setActiveChat] = useState(null);
    const [chats, setChats] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

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
        if (!currentUser) return;
        fetchChats();

        const subscription = supabase
            .channel('public:messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                // alert('DEBUG: Message Inserted!'); // Optional
                if (payload.new.sender_id === currentUser.id || payload.new.receiver_id === currentUser.id) {
                    // alert('DEBUG: New Message for ME!');
                    fetchChats();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [currentUser]);

    useEffect(() => {
        if (initialChatUser) {
            const existingChat = chats.find(c => c.other_user_id === initialChatUser.id);
            if (existingChat) {
                setActiveChat(initialChatUser.id);
            } else {
                const newChat = {
                    other_user_id: initialChatUser.id,
                    username: initialChatUser.name || initialChatUser.username,
                    avatar_url: initialChatUser.avatar_url || initialChatUser.avatar,
                    last_message: '',
                    unread: 0,
                    status: 'offline'
                };
                setChats(prev => {
                    // avoid duplicates
                    if (prev.some(c => c.other_user_id === initialChatUser.id)) return prev;
                    return [newChat, ...prev];
                });
                setActiveChat(initialChatUser.id);
            }
        }
    }, [initialChatUser, chats.length]);

    useEffect(() => {
        if (!activeChat || !currentUser) return;

        const fetchMessages = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeChat}),and(sender_id.eq.${activeChat},receiver_id.eq.${currentUser.id})`)
                .order('created_at', { ascending: true });

            if (!error) {
                setMessages(data);
                // Mark as read
                await supabase
                    .from('messages')
                    .update({ is_read: true })
                    .eq('sender_id', activeChat)
                    .eq('receiver_id', currentUser.id)
                    .eq('is_read', false);
            }
            setLoading(false);
        };

        fetchMessages();

        const channel = supabase
            .channel(`chat:${activeChat}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${currentUser.id}`,
            }, (payload) => {
                if (payload.new.sender_id === activeChat) {
                    setMessages(prev => [...prev, payload.new]);
                }
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `sender_id=eq.${currentUser.id}`,
            }, (payload) => {
                if (payload.new.receiver_id === activeChat) {
                    setMessages(prev => {
                        if (prev.some(m => m.id === payload.new.id)) return prev;
                        return [...prev, payload.new];
                    });
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeChat, currentUser]);


    const fetchChats = async () => {
        const { data: msgs, error } = await supabase
            .from('messages')
            .select('*, sender:sender_id(username, avatar_url), receiver:receiver_id(username, avatar_url)')
            .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error || !msgs) {
            console.error('[ChatModal] fetchChats error:', error);
            return;
        }
        console.log('[ChatModal] fetchChats raw msgs:', msgs.length, msgs);

        const chatMap = new Map();
        msgs.forEach(msg => {
            const isMe = msg.sender_id === currentUser.id;
            const otherId = isMe ? msg.receiver_id : msg.sender_id;
            const otherProfile = isMe ? msg.receiver : msg.sender;

            if (!chatMap.has(otherId)) {
                chatMap.set(otherId, {
                    other_user_id: otherId,
                    username: otherProfile?.username || 'Unknown',
                    avatar_url: otherProfile?.avatar_url,
                    last_message: msg.content,
                    unread: (!isMe && !msg.is_read) ? 1 : 0,
                    timestamp: msg.created_at,
                    status: 'offline'
                });
            } else {
                const chat = chatMap.get(otherId);
                if (!isMe && !msg.is_read) {
                    chat.unread += 1;
                }
            }
        });

        setChats(Array.from(chatMap.values()));
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChat) return;

        const tempMsg = {
            id: Date.now(),
            sender_id: currentUser.id,
            receiver_id: activeChat,
            content: newMessage,
            created_at: new Date().toISOString(),
            is_read: false
        };
        // Optimistic
        setMessages(prev => [...prev, tempMsg]);
        setNewMessage('');

        const { data, error } = await supabase
            .from('messages')
            .insert([{
                sender_id: currentUser.id,
                receiver_id: activeChat,
                content: tempMsg.content
            }])
            .select();

        if (error) {
            console.error('Error sending:', error);
        } else {
            fetchChats();
        }
    };

    const handleAcceptRequest = async (msg) => {
        try {
            // 1. Create Friendship (Bidirectional via RPC)
            // Uses security definer function to bypass RLS for the other user's row
            const { error: fError } = await supabase.rpc('accept_friend_request', {
                user_a: currentUser.id,
                user_b: activeChat
            });

            if (fError) {
                console.error('Error accepting:', fError);
                return;
            }

            // 2. Update Message Status
            const { error: mError } = await supabase
                .from('messages')
                .update({ metadata: { ...msg.metadata, status: 'accepted' } })
                .eq('id', msg.id);

            if (!mError) {
                // Update local state and trigger refresh
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, metadata: { ...m.metadata, status: 'accepted' } } : m));
                window.dispatchEvent(new Event('friend-updated')); // Notify SocialPanel
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeclineRequest = async (msg) => {
        try {
            const { error } = await supabase
                .from('messages')
                .update({ metadata: { ...msg.metadata, status: 'declined' } })
                .eq('id', msg.id);

            if (!error) {
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, metadata: { ...m.metadata, status: 'declined' } } : m));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteChat = async (e, otherId) => {
        e.stopPropagation();
        setChats(chats.filter(c => c.other_user_id !== otherId));
        if (activeChat === otherId) setActiveChat(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl h-[600px] rounded-3xl shadow-2xl flex overflow-hidden">

                {/* Sidebar - Chat List */}
                <div className="w-1/3 bg-slate-800/50 border-r border-slate-700/50 flex flex-col">
                    <div className="p-4 border-b border-slate-700/50 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <MessageSquare className="text-blue-500" /> Messages
                        </h2>
                    </div>

                    {/* Search (Visual only) */}
                    <div className="p-4 pb-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search chats..."
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {chats.length === 0 && (
                            <div className="text-center text-slate-500 mt-10 p-4">
                                <p className="text-sm">No messages yet.</p>
                                <p className="text-xs mt-2">Start a chat from the Social Panel!</p>
                            </div>
                        )}
                        {chats.map(chat => (
                            <div
                                key={chat.other_user_id}
                                onClick={() => setActiveChat(chat.other_user_id)}
                                className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${activeChat === chat.other_user_id ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-slate-700/30 border border-transparent'
                                    }`}
                            >
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white overflow-hidden">
                                        {chat.avatar_url ? (
                                            <img src={chat.avatar_url} alt={chat.username} className="w-full h-full object-cover" />
                                        ) : (
                                            chat.username.substring(0, 2).toUpperCase()
                                        )}
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-800 ${chat.status === 'online' ? 'bg-green-500' : 'bg-slate-500'
                                        }`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className={`text-sm font-bold truncate ${activeChat === chat.other_user_id ? 'text-blue-200' : 'text-white'}`}>
                                            {chat.username}
                                        </h4>
                                        {chat.unread > 0 && (
                                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                                {chat.unread}
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-xs truncate ${chat.unread > 0 ? 'text-white font-semibold' : 'text-slate-400'}`}>
                                        {chat.last_message || 'Draft...'}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => handleDeleteChat(e, chat.other_user_id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-slate-900 relative">
                    {activeChat ? (
                        <>
                            {/* Header */}
                            <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white text-xs overflow-hidden">
                                        {chats.find(c => c.other_user_id === activeChat)?.avatar_url ? (
                                            <img src={chats.find(c => c.other_user_id === activeChat)?.avatar_url} className="w-full h-full object-cover" />
                                        ) : (
                                            (chats.find(c => c.other_user_id === activeChat)?.username || '??').substring(0, 2).toUpperCase()
                                        )}
                                    </div>
                                    <span className="font-bold text-white">
                                        {chats.find(c => c.other_user_id === activeChat)?.username}
                                    </span>
                                </div>
                                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {messages.map((msg, idx) => {
                                    const isMe = msg.sender_id === currentUser.id;
                                    const isFriendRequest = msg.type === 'friend_request';
                                    const isPartyInvite = typeof msg.content === 'string' && msg.content.startsWith('PARTY_INVITE:::');
                                    const isPartyProposal = typeof msg.content === 'string' && msg.content.startsWith('PARTY_PROPOSAL:::');
                                    const status = msg.metadata?.status || 'pending';

                                    if (isPartyProposal) {
                                        const senderUsername = msg.content.split(':::')[1];
                                        return (
                                            <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4`}>
                                                <div className={`max-w-[80%] rounded-2xl p-1 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 ${isMe ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
                                                    <div className="bg-slate-900/90 rounded-xl p-4">
                                                        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-indigo-400 uppercase tracking-widest">
                                                            <Gamepad2 size={14} /> Party Proposal
                                                        </div>
                                                        <p className="text-sm text-white mb-4 italic">
                                                            "{t?.partyProposalText || "I propose we start a party!"}"
                                                        </p>

                                                        {!isMe && (
                                                            party ? (
                                                                <button
                                                                    disabled
                                                                    className="w-full py-2 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-default"
                                                                >
                                                                    <Check size={14} /> Accepted
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => {
                                                                        console.log('[ChatModal] Accept clicked for:', senderUsername);
                                                                        if (onAcceptProposal) onAcceptProposal(senderUsername);
                                                                    }}
                                                                    className="w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-green-900/40"
                                                                >
                                                                    Accept Proposal
                                                                </button>
                                                            )
                                                        )}
                                                        {isMe && (
                                                            <div className="text-xs text-slate-500 text-center py-1">
                                                                Proposal sent.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (isPartyInvite) {
                                        const partyId = msg.content.split(':::')[1];
                                        return (
                                            <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4`}>
                                                <div className={`max-w-[80%] rounded-2xl p-1 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 ${isMe ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
                                                    <div className="bg-slate-900/90 rounded-xl p-4">
                                                        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-indigo-400 uppercase tracking-widest">
                                                            <Gamepad2 size={14} /> Party Invite
                                                        </div>
                                                        <p className="text-sm text-white mb-4 italic">"{t?.partyInviteText || "Let's team up!"}"</p>

                                                        {!isMe && (
                                                            <button
                                                                onClick={() => onJoinParty && onJoinParty(partyId)}
                                                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-indigo-900/40"
                                                            >
                                                                Join Party
                                                            </button>
                                                        )}
                                                        {isMe && (
                                                            <div className="text-xs text-slate-500 text-center py-1">
                                                                Invite sent.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (isFriendRequest) {
                                        return (
                                            <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4`}>
                                                <div className={`max-w-[80%] rounded-2xl p-1 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 ${isMe ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
                                                    <div className="bg-slate-900/90 rounded-xl p-4">
                                                        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-blue-400 uppercase tracking-widest">
                                                            <UserPlus size={14} /> Friend Request
                                                        </div>
                                                        <p className="text-sm text-white mb-4 italic">"{msg.content}"</p>

                                                        {status === 'pending' && !isMe && (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleAcceptRequest(msg)}
                                                                    className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition-all"
                                                                >
                                                                    Accept
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeclineRequest(msg)}
                                                                    className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-bold transition-all"
                                                                >
                                                                    Decline
                                                                </button>
                                                            </div>
                                                        )}

                                                        {status === 'pending' && isMe && (
                                                            <div className="text-xs text-slate-500 text-center py-1 bg-slate-800/50 rounded-lg">
                                                                Waiting for response...
                                                            </div>
                                                        )}

                                                        {status === 'accepted' && (
                                                            <div className="text-xs text-green-400 font-bold text-center py-2 bg-green-500/10 rounded-lg border border-green-500/20">
                                                                Request Accepted!
                                                            </div>
                                                        )}

                                                        {status === 'declined' && (
                                                            <div className="text-xs text-red-400 font-bold text-center py-2 bg-red-500/10 rounded-lg border border-red-500/20">
                                                                Request Declined
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMe
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-slate-800 text-slate-200 rounded-tl-none'
                                                }`}>
                                                <p className="text-sm">{msg.content}</p>
                                                <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-slate-500'}`}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-4 bg-slate-800/30 border-t border-slate-700/50">
                                <form onSubmit={handleSendMessage} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type a message..."
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                                    />
                                    <button
                                        type="submit"
                                        className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all hover:scale-105 shadow-lg shadow-blue-900/30 disabled:opacity-50 disabled:hover:scale-100"
                                        disabled={!newMessage.trim()}
                                    >
                                        <Send size={20} />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                            <MessageSquare size={48} className="mb-4 opacity-20" />
                            <p>Select a chat or start one from the Social Panel</p>
                            <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
