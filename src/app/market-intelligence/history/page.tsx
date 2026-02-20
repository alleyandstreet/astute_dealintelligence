"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { History as HistoryIcon, Search, Clock, ArrowUpRight, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";

interface HistoryItem {
    id: string;
    query: string;
    timestamp: string;
}

export default function HistoryPage() {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        // We could extract history from saved reports or a separate history key
        // For now, let's use a mock history or extract from saved reports
        const saved = localStorage.getItem("astute_saved_reports");
        if (saved) {
            try {
                const reports = JSON.parse(saved);
                const extractedHistory = reports.map((r: any) => ({
                    id: r.id.toString(),
                    query: r.topic,
                    timestamp: r.date
                }));
                setHistory(extractedHistory);
            } catch (e) {
                console.error("Failed to parse history", e);
            }
        }
    }, []);

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        const updated = history.filter(h => h.id !== id);
        setHistory(updated);
        // Note: In a real app we'd also update the underlying reports or a separate history store
        toast.success("History item removed");
    };

    const filteredHistory = history.filter(h =>
        h.query.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 pb-20">
            <header>
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
                    Search History
                </h1>
                <p className="text-zinc-400 mt-2">
                    Review your past market intelligence research queries
                </p>
            </header>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                    type="text"
                    placeholder="Search history..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
            </div>

            {filteredHistory.length === 0 ? (
                <GlassCard className="p-12 text-center border-dashed border-white/10">
                    <HistoryIcon className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No history items</h3>
                    <p className="text-zinc-500">
                        {searchTerm ? "No matches found for your search." : "Your search history is currently empty."}
                    </p>
                </GlassCard>
            ) : (
                <GlassCard className="overflow-hidden">
                    <div className="divide-y divide-white/5">
                        {filteredHistory.map((item) => (
                            <div key={item.id} className="p-4 hover:bg-white/5 transition-colors group flex items-center justify-between">
                                <Link href="/market-intelligence" className="flex items-center gap-4 flex-1">
                                    <div className="w-8 h-8 rounded bg-cyan-500/10 flex items-center justify-center">
                                        <Clock className="w-4 h-4 text-cyan-400" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium group-hover:text-cyan-400 transition-colors">{item.query}</p>
                                        <p className="text-xs text-zinc-500">{new Date(item.timestamp).toLocaleString()}</p>
                                    </div>
                                </Link>
                                <div className="flex items-center gap-2">
                                    <Link href="/market-intelligence">
                                        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                                            Re-run <ArrowUpRight className="w-3 h-3 ml-1" />
                                        </Button>
                                    </Link>
                                    <button
                                        onClick={(e) => handleDelete(item.id, e)}
                                        className="p-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            )}
        </div>
    );
}
