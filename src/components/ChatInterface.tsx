"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2, Image as ImageIcon, X, MoreVertical, Pencil, EyeOff, History } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

interface EditHistory {
    content: string;
    timestamp: string;
}

interface Message {
    id: string;
    content: string;
    sender: string;
    senderEmail?: string;
    createdAt: string;
    attachment?: string;
    attachmentType?: string;
    editHistory?: EditHistory[];
}

interface ChatInterfaceProps {
    mode?: "floating" | "full";
}

export default function ChatInterface({ mode = "floating" }: ChatInterfaceProps) {
    const { data: session } = useSession();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [attachment, setAttachment] = useState<{ content: string; type: string } | null>(null);

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");
    const [showHistoryId, setShowHistoryId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Poll for new messages every 3 seconds
    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, []);

    // Scroll to bottom on new messages (only if near bottom or finding first load)
    useEffect(() => {
        if (scrollRef.current) {
            // Simple auto-scroll logic, can be improved to not scroll if user looks up
            if (!editingId) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }
    }, [messages.length, editingId]); // re-scroll when message count changes

    const processFile = (file: File) => {
        if (!file.type.startsWith("image/")) {
            toast.error("Only image files are supported.");
            return;
        }
        if (file.size > 2 * 1024 * 1024) { // 2MB limit for base64
            toast.error("Image too large. Please select an image under 2MB.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            setAttachment({ content: base64, type: "image" });
        };
        reader.readAsDataURL(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.startsWith("image/")) {
                const file = item.getAsFile();
                if (file) {
                    e.preventDefault();
                    processFile(file);
                    return; // Only take the first image
                }
            }
        }
    };

    const fetchMessages = async () => {
        try {
            const res = await fetch("/api/team-chat");
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (error) {
            console.error("Failed to fetch messages");
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && !attachment) || isSending) return;

        setIsSending(true);
        try {
            const res = await fetch("/api/team-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: newMessage,
                    sender: session?.user?.name || "User", // Use real name or fallback
                    attachment: attachment?.content,
                    attachmentType: attachment?.type,
                }),
            });

            if (res.ok) {
                const msg = await res.json();
                setMessages([...messages, msg]);
                setNewMessage("");
                setAttachment(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        } catch (error) {
            toast.error("Failed to send message");
        } finally {
            setIsSending(false);
        }
    };

    const startEditing = (msg: Message) => {
        setEditingId(msg.id);
        setEditContent(msg.content);
        setShowHistoryId(null);
    };

    const saveEdit = async () => {
        if (!editingId || !editContent.trim()) return;

        try {
            const res = await fetch("/api/team-chat", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: editingId, content: editContent }),
            });

            if (res.ok) {
                const updated = await res.json();
                setMessages(messages.map(m => m.id === editingId ? updated : m));
                setEditingId(null);
                setEditContent("");
                toast.success("Message updated");
            } else {
                toast.error("Failed to update");
            }
        } catch (error) {
            toast.error("Error updating message");
        }
    };

    const deleteForMe = async (id: string) => {
        try {
            const res = await fetch("/api/team-chat", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });

            if (res.ok) {
                setMessages(messages.filter(m => m.id !== id));
                toast.success("Message hidden for you");
            } else {
                toast.error("Failed to hide message");
            }
        } catch (error) {
            toast.error("Error hiding message");
        }
    };

    return (
        <div
            className={`flex flex-col h-full bg-[#121214]/95 backdrop-blur-xl relative ${mode === 'floating' ? '' : 'rounded-2xl border border-[var(--border)] shadow-2xl'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drag Overlay */}
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-cyan-500/20 backdrop-blur-sm border-2 border-dashed border-cyan-500 rounded-xl flex flex-col items-center justify-center p-8 transition-all pointer-events-none">
                    <div className="bg-cyan-500/20 p-6 rounded-full animate-bounce">
                        <ImageIcon className="w-12 h-12 text-cyan-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mt-4">Drop Image Here</h3>
                </div>
            )}

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--text-dim)] text-xs gap-3 opacity-60">
                        <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                            <Send className="w-5 h-5 text-cyan-400" />
                        </div>
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = session?.user?.email === msg.senderEmail || (!msg.senderEmail && msg.sender === "Me"); // Fallback for old/local messages
                        const isEditing = editingId === msg.id;

                        return (
                            <div key={msg.id} className={`group flex flex-col ${isMe ? "items-end" : "items-start"} relative`}>
                                <div
                                    className={`max-w-[85%] p-3 rounded-xl text-sm relative group ${isMe
                                        ? "bg-cyan-600 text-white rounded-tr-none"
                                        : "bg-[var(--card)] border border-[var(--border)] text-[var(--text)] rounded-tl-none"
                                        }`}
                                >
                                    {/* Action Buttons for message */}
                                    <div className={`absolute top-0 ${isMe ? "-left-16" : "-right-16"} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/50 p-1 rounded-lg backdrop-blur-md`}>
                                        {isMe && !isEditing && (
                                            <button onClick={() => startEditing(msg)} className="p-1 hover:bg-white/20 rounded text-white" title="Edit">
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                        )}
                                        <button onClick={() => deleteForMe(msg.id)} className="p-1 hover:bg-white/20 rounded text-white" title="Delete for me">
                                            <EyeOff className="w-3 h-3" />
                                        </button>
                                    </div>

                                    {/* Edit Mode */}
                                    {isEditing ? (
                                        <div className="flex flex-col gap-2 min-w-[200px]">
                                            <textarea
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                className="bg-black/20 rounded p-2 text-white text-sm outline-none border border-white/20 focus:border-white/50 w-full"
                                                rows={2}
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setEditingId(null)} className="text-xs text-white/70 hover:text-white">Cancel</button>
                                                <button onClick={saveEdit} className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-white font-medium">Save</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {msg.attachment && msg.attachmentType === 'image' && (
                                                <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                                                    <img src={msg.attachment} alt="Attachment" className="max-w-full h-auto object-cover max-h-[200px]" />
                                                </div>
                                            )}
                                            {msg.content && <p className="leading-relaxed">{msg.content}</p>}
                                        </>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 mt-1 px-1">
                                    <span className="text-[10px] text-[var(--text-dim)]">
                                        {isMe ? "You" : msg.sender} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {msg.editHistory && msg.editHistory.length > 0 && !isEditing && (
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowHistoryId(showHistoryId === msg.id ? null : msg.id)}
                                                className="text-[10px] text-cyan-500/80 hover:text-cyan-400 flex items-center gap-0.5 cursor-pointer"
                                            >
                                                (edited)
                                            </button>

                                            {showHistoryId === msg.id && (
                                                <div className="absolute bottom-full mb-2 left-0 w-48 bg-[#1a1a1c] border border-[var(--border)] rounded-xl p-2 shadow-xl z-50 text-left">
                                                    <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2 flex items-center gap-1">
                                                        <History className="w-3 h-3" /> Edit History
                                                    </h4>
                                                    <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                                                        {msg.editHistory.slice().reverse().map((hist, i) => (
                                                            <div key={i} className="text-xs border-b border-white/5 pb-1 last:border-0 last:pb-0">
                                                                <p className="text-white/80 line-through opacity-70 mb-0.5">{hist.content}</p>
                                                                <p className="text-[9px] text-[var(--text-dim)]">{new Date(hist.timestamp).toLocaleString()}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Attachment Preview */}
            {attachment && (
                <div className="px-4 py-2 bg-[var(--card)] border-t border-[var(--border)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-[var(--border)]">
                            <img src={attachment.content} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">Image attached</span>
                    </div>
                    <button
                        onClick={() => {
                            setAttachment(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="p-1 hover:bg-[var(--background)] rounded-full text-[var(--text-muted)] hover:text-red-400 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Input Area */}
            <form onSubmit={sendMessage} className="p-3 border-t border-[var(--border)] bg-[var(--card)]">
                <div className="flex items-end gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onPaste={handlePaste} // Supported via Clipboard event
                            placeholder={mode === 'full' ? "Type a message to your team (or paste/drop an image)..." : "Type a message..."}
                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg pl-3 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-[var(--card)] rounded-md text-[var(--text-muted)] hover:text-cyan-400 transition-colors"
                            title="Attach Image"
                        >
                            <ImageIcon className="w-4 h-4" />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={(!newMessage.trim() && !attachment) || isSending}
                        className="p-2.5 bg-cyan-500 rounded-lg text-white hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
                    >
                        {isSending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
