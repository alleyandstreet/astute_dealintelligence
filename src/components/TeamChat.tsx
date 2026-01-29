"use client";

import { useState } from "react";
import { MessageSquare, X, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ChatInterface from "./ChatInterface";

import { useSession } from "next-auth/react";

export default function TeamChat() {
    const { status } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    if (status !== "authenticated") return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2">
            <AnimatePresence>
                {isOpen && !isMinimized && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20, originY: 1, originX: 1 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-[320px] h-[450px] bg-[#121214]/95 backdrop-blur-xl border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 bg-[var(--card)] border-b border-[var(--border)] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <h3 className="font-semibold text-white text-sm">Team Chat</h3>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setIsMinimized(true)}
                                    className="p-1 hover:bg-[var(--background)] rounded text-[var(--text-muted)]"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 hover:bg-[var(--background)] rounded text-[var(--text-muted)] hover:text-red-400"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Reusable Interface */}
                        <ChatInterface mode="floating" />

                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => {
                    setIsOpen(true);
                    setIsMinimized(false);
                }}
                className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${isOpen && !isMinimized
                    ? "bg-[var(--card)] text-cyan-400 border border-cyan-500"
                    : "bg-cyan-500 text-white hover:bg-cyan-600 hover:scale-110"
                    }`}
            >
                <MessageSquare className="w-5 h-5" />
            </button>
        </div>
    );
}

