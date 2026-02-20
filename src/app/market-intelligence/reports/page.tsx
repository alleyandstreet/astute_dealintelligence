"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, ArrowRight, Calendar, Search, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SavedReport {
    id: number;
    date: string;
    topic: string;
    analysis: any;
}

export default function SavedReportsPage() {
    const [reports, setReports] = useState<SavedReport[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const router = useRouter();

    useEffect(() => {
        const saved = localStorage.getItem("astute_saved_reports");
        if (saved) {
            try {
                setReports(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse saved reports", e);
            }
        }
    }, []);

    const handleDelete = (id: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const updated = reports.filter(r => r.id !== id);
        setReports(updated);
        localStorage.setItem("astute_saved_reports", JSON.stringify(updated));
        toast.success("Report deleted");
    };

    const handleLoadReport = (report: SavedReport) => {
        // Save to current session so the main page picks it up
        localStorage.setItem("astute_market_intel_session_v4", JSON.stringify({
            input: report.topic,
            analysis: report.analysis
        }));
        router.push("/market-intelligence");
    };

    const filteredReports = reports.filter(r =>
        r.topic.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 pb-20">
            <header>
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                    Saved Reports
                </h1>
                <p className="text-zinc-400 mt-2">
                    Your library of analyst-grade strategic deep dives
                </p>
            </header>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                    type="text"
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
            </div>

            {filteredReports.length === 0 ? (
                <GlassCard className="p-12 text-center border-dashed border-white/10">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-zinc-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No reports found</h3>
                    <p className="text-zinc-500 mb-6">
                        {searchTerm ? "Try a different search term" : "You haven't saved any research reports yet."}
                    </p>
                    {!searchTerm && (
                        <Link href="/market-intelligence">
                            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                                Start New Research
                            </Button>
                        </Link>
                    )}
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredReports.map((report) => (
                            <motion.div
                                key={report.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                            >
                                <GlassCard
                                    className="p-6 h-full flex flex-col hover:border-purple-500/30 transition-colors group cursor-pointer"
                                    onClick={() => handleLoadReport(report)}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(report.id, e)}
                                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">
                                        {report.topic}
                                    </h3>

                                    <div className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
                                        <Calendar className="w-4 h-4" />
                                        {new Date(report.date).toLocaleDateString()}
                                    </div>

                                    <div className="mt-auto flex justify-between items-center text-sm">
                                        <span className="text-zinc-400 font-medium">View Analysis</span>
                                        <ArrowRight className="w-4 h-4 text-purple-400 transform group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </GlassCard>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
