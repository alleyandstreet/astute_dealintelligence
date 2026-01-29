"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Trash2, MessageSquare, Image as ImageIcon, Search, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
    id: string;
    content: string;
    sender: string;
    createdAt: string;
    attachment?: string;
    attachmentType?: string;
}

export default function AdminChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/team-chat");
            if (res.ok) {
                const data = await res.json();
                // Sort by newest first for admin view
                setMessages(data.reverse());
            }
        } catch (error) {
            toast.error("Failed to fetch messages");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to permanently delete this message?")) return;

        try {
            const res = await fetch(`/api/team-chat?id=${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setMessages(messages.filter(m => m.id !== id));
                toast.success("Message deleted");
            } else {
                toast.error("Failed to delete message");
            }
        } catch (error) {
            toast.error("Error deleting message");
        }
    };

    const filteredMessages = messages.filter(msg =>
        msg.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.sender.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AdminLayout>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_10px_cyan]"></div>
                            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">Communication Oversight</span>
                        </div>
                        <h1 className="text-4xl font-extrabold text-white tracking-tight">Chat Management</h1>
                        <p className="text-slate-400 mt-2">Monitor and moderate team discussions.</p>
                    </div>
                </div>

                <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl">
                    {/* Toolbar */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search messages or senders..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                            />
                        </div>
                        <div className="px-4 py-2 bg-slate-900/50 rounded-xl border border-slate-700/50">
                            <span className="text-sm text-slate-400 font-mono">Total: <span className="text-white font-bold">{messages.length}</span></span>
                        </div>
                    </div>

                    {/* Messages List */}
                    <div className="space-y-4">
                        {isLoading ? (
                            <div className="text-center py-20 text-slate-500">Loading messages...</div>
                        ) : filteredMessages.length === 0 ? (
                            <div className="text-center py-20 flex flex-col items-center gap-3">
                                <MessageSquare className="w-12 h-12 text-slate-700" />
                                <p className="text-slate-500">No messages found.</p>
                            </div>
                        ) : (
                            <AnimatePresence>
                                {filteredMessages.map((msg) => (
                                    <motion.div
                                        key={msg.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="group bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800/50 hover:border-slate-700 rounded-2xl p-4 transition-all flex items-start gap-4"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border border-slate-700 text-sm font-bold text-slate-400">
                                            {msg.sender.substring(0, 2).toUpperCase()}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-bold text-white">{msg.sender}</span>
                                                <span className="text-xs text-slate-500">{new Date(msg.createdAt).toLocaleString()}</span>
                                            </div>

                                            {msg.content && (
                                                <p className="text-slate-300 text-sm leading-relaxed break-words">{msg.content}</p>
                                            )}

                                            {msg.attachment && msg.attachmentType === 'image' && (
                                                <div className="mt-3 relative w-fit group/image">
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/image:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                                        <ImageIcon className="text-white w-6 h-6" />
                                                    </div>
                                                    <img
                                                        src={msg.attachment}
                                                        alt="Attachment"
                                                        className="h-32 w-auto rounded-lg border border-slate-700 object-cover"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => handleDelete(msg.id)}
                                            className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            title="Delete Message"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
