import React, { useState, useEffect, useRef } from 'react';
import { Send, User, X, MessageSquare, Crown } from 'lucide-react';

export function PartyModal({ party, currentUser, onClose, onLeave, onChat, onKick }) {
    const [message, setMessage] = useState('');
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [party.chat]); // Assuming party object receives chat messages or we pass a separate chat log?
    // Setup: Usually chat is ephemeral in PartyManager but useful to persist in client state?
    // For now, let's assume `party` object contains a `chat` array or similar,
    // OR we receive chat messages separately. 
    // The PartyManager on server doesn't seem to store chat history (it just broadcasts).
    // Implementation Update: App.jsx needs to accumulate chat messages.

    const sendMessage = (e) => {
        e.preventDefault();
        if (message.trim()) {
            onChat(message);
            setMessage('');
        }
    };

    const isLeader = party.leaderId === currentUser?.socketId; // Or check username match if socketId unstable? socketId is best.

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-4xl h-[600px] bg-slate-900 rounded-xl border border-slate-700 shadow-2xl flex overflow-hidden">

                {/* Header / Close (Mobile mostly, desktop has layout) */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-slate-800/50 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Left Side: Members */}
                <div className="w-1/3 border-r border-slate-700 bg-slate-800/30 flex flex-col">
                    <div className="p-4 border-b border-slate-700">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Crown className="text-amber-400" size={20} />
                            Party Members
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            {party.members.length} / 4 Players
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {party.members.map((member) => (
                            <div key={member.socketId} className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg border border-slate-700">
                                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                                    {member.username.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-medium">{member.username}</span>
                                        {party.leaderId === member.socketId && (
                                            <Crown size={14} className="text-amber-400" />
                                        )}
                                    </div>
                                    {/* Status Indicator */}
                                    <div className="text-xs text-emerald-400">Online</div>
                                </div>
                            </div>
                        ))}

                        {/* Empty Slots */}
                        {[...Array(4 - party.members.length)].map((_, i) => (
                            <div key={`empty-${i}`} className="flex items-center gap-3 p-3 rounded-lg border border-slate-700 border-dashed text-slate-500">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                                    <User size={16} />
                                </div>
                                <span>Empty Slot</span>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 border-t border-slate-700">
                        <button
                            onClick={onLeave}
                            className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                        >
                            Leave Party
                        </button>
                    </div>
                </div>

                {/* Right Side: Chat */}
                <div className="flex-1 flex flex-col bg-slate-900">
                    <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <MessageSquare size={18} className="text-indigo-400" />
                            Party Chat
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* We need a prop for messages, assuming 'chatMessages' array passed or inside party */}
                        {party.chatMessages && party.chatMessages.map((msg, idx) => (
                            <div key={idx} className={`flex flex-col ${msg.sender === currentUser.socketId ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-lg ${msg.sender === currentUser.socketId
                                        ? 'bg-indigo-600 text-white rounded-tr-none'
                                        : 'bg-slate-700 text-slate-200 rounded-tl-none'
                                    }`}>
                                    {msg.text}
                                </div>
                                <span className="text-xs text-slate-500 mt-1">
                                    {msg.senderName || 'Member'}
                                </span>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="p-4 border-t border-slate-700 bg-slate-800/30">
                        <form onSubmit={sendMessage} className="flex gap-2">
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                            />
                            <button
                                type="submit"
                                className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                            >
                                <Send size={20} />
                            </button>
                        </form>
                    </div>
                </div>

            </div>
        </div>
    );
}
