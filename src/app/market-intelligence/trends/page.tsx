"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import {
    LineChart,
    Sparkles,
    TrendingUp,
    Zap,
    Globe,
    AlertCircle,
    ArrowUpRight,
    Activity,
    BarChart3,
    ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";

interface Trend {
    id: string;
    name: string;
    description: string;
    impact: string;
    sentiment: string;
    growth_rate: string;
    key_players: string[];
    thesis: string;
}

interface TrendWatchData {
    global_sentiment: string;
    featured_insight: string;
    trends: Trend[];
    source?: 'live' | 'cached';
}

export default function TrendsPage() {
    const [data, setData] = useState<TrendWatchData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrends = async () => {
            try {
                const res = await fetch("/api/market-intelligence/trends");
                if (!res.ok) throw new Error("Failed to fetch trends");
                const result = await res.json();
                setData(result);
            } catch (e) {
                console.error("Trends fetch error:", e);
                // Fallback mock if API fails
                setData({
                    global_sentiment: "Bullish",
                    featured_insight: "The intersection of specialized GenAI and legacy ERP systems is the next multi-billion dollar frontier.",
                    trends: [
                        {
                            id: "vertical-ai",
                            name: "Vertical-Specific AI Agents",
                            description: "Specialized models for legal, medical, and engineering sectors are outperforming general models.",
                            impact: "High",
                            sentiment: "Positive",
                            growth_rate: "+42% YoY",
                            key_players: ["Harvey", "Ambience Healthcare"],
                            thesis: "Invest in high-moat specialized datasets."
                        }
                    ]
                });
            } finally {
                setLoading(false);
            }
        };

        fetchTrends();
    }, []);

    const getSentimentColor = (sentiment: string) => {
        switch (sentiment.toLowerCase()) {
            case 'positive': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'negative': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
            default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
        }
    };

    const getImpactColor = (impact: string) => {
        switch (impact.toLowerCase()) {
            case 'high': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
            case 'medium': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
        }
    };

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
                <div className="h-10 w-64 bg-white/5 rounded-lg mb-4" />
                <div className="h-4 w-96 bg-white/5 rounded-lg" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-white/5 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 pb-20">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Live Pulse
                        </span>
                        {data?.source === 'cached' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20 animate-pulse">
                                Rate Limited // Cached Intel
                            </span>
                        )}
                        {data?.source === 'live' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                Cloud Connection: Active
                            </span>
                        )}
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-600">
                        Trend Watch
                    </h1>
                    <p className="text-zinc-400 mt-2">
                        Real-time market sentiment and emerging industrial shifts
                    </p>
                </div>

                <GlassCard className="px-6 py-3 border-white/5 bg-white/5 flex items-center gap-6">
                    <div className="text-center">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Global Sentiment</p>
                        <p className={`text-lg font-bold ${data?.global_sentiment.includes('Bullish') ? 'text-emerald-400' : 'text-cyan-400'}`}>
                            {data?.global_sentiment || "Neutral"}
                        </p>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Active Trends</p>
                        <p className="text-lg font-bold text-white">{data?.trends.length || 0}</p>
                    </div>
                </GlassCard>
            </header>

            <AnimatePresence>
                {data?.featured_insight && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-1 bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-blue-500/20 rounded-2xl"
                    >
                        <div className="bg-zinc-900/90 backdrop-blur-xl rounded-xl p-6 flex items-start gap-4">
                            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <Sparkles className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] mb-1">Featured Insight</h4>
                                <p className="text-xl font-medium text-white italic line-clamp-2">
                                    "{data.featured_insight}"
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data?.trends.map((trend, idx) => (
                    <motion.div
                        key={trend.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <GlassCard className="p-6 h-full flex flex-col group hover:border-emerald-500/30 transition-all duration-500">
                            <div className="flex items-start justify-between mb-6">
                                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:scale-110 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all duration-500">
                                    <Activity className="w-5 h-5 text-zinc-400 group-hover:text-emerald-400" />
                                </div>
                                <div className="flex gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getSentimentColor(trend.sentiment)}`}>
                                        {trend.sentiment}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getImpactColor(trend.impact)}`}>
                                        {trend.impact} Impact
                                    </span>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                                {trend.name}
                            </h3>
                            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                                {trend.description}
                            </p>

                            <div className="mt-auto space-y-4">
                                <div className="flex items-center justify-between text-xs px-3 py-2 bg-white/5 rounded-lg border border-white/5">
                                    <span className="text-zinc-500">Growth Signal</span>
                                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" /> {trend.growth_rate}
                                    </span>
                                </div>

                                <div className="bg-zinc-800/50 rounded-xl p-4 border border-white/5">
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Acquisition Thesis</p>
                                    <p className="text-xs text-zinc-300 leading-relaxed italic">
                                        {trend.thesis}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <div className="flex -space-x-1">
                                        {trend.key_players.map((p, i) => (
                                            <div key={i} className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-zinc-900 flex items-center justify-center text-[8px] text-zinc-400 font-bold" title={p}>
                                                {p.substring(0, 1)}
                                            </div>
                                        ))}
                                    </div>
                                    <Link href="/market-intelligence">
                                        <Button variant="ghost" size="sm" className="h-8 text-[11px] font-bold text-zinc-400 hover:text-white group/btn">
                                            Scan Space <ArrowUpRight className="w-3 h-3 ml-1.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                ))}
            </div>

            <GlassCard className="p-12 text-center border-dashed border-white/10 relative overflow-hidden mt-12 bg-white/[0.02]">
                <div className="absolute top-0 right-0 p-4">
                    <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-wider border border-purple-500/20">
                        Agentic Mode
                    </span>
                </div>

                <div className="relative z-10">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-2xl">
                        <BarChart3 className="w-8 h-8 text-cyan-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4">Custom Trend Modeling</h2>
                    <p className="text-zinc-400 max-w-lg mx-auto mb-8">
                        Looking for something specific? Our agents can perform targeted scans on niche markets and generate bespoke trend reports for your investment committee.
                    </p>
                    <Link href="/market-intelligence/custom-modeling">
                        <Button className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold px-8 h-12 rounded-xl shadow-lg shadow-emerald-500/20">
                            Launch Immersive Modeling <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                </div>
            </GlassCard>
        </div>
    );
}
