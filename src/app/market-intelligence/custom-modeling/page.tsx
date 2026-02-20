"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import {
    Zap,
    Search,
    Activity,
    Shield,
    TrendingUp,
    Cpu,
    Globe,
    ArrowLeft,
    Loader2,
    Lock,
    Compass,
    LayoutDashboard
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface ModeledTrend {
    name: string;
    velocity: string;
    disruption_potential: string;
    key_drivers: string[];
    impact_narrative: string;
}

interface StrategicRoadmap {
    phase: string;
    action: string;
    risk_mitigation: string;
}

interface CustomAnalysis {
    topic: string;
    horizon_scan: {
        short_term: string;
        medium_term: string;
        long_term: string;
    };
    modeled_trends: ModeledTrend[];
    strategic_roadmap: StrategicRoadmap[];
    sentiment_index: number;
    source?: 'live' | 'cached';
}

const AGENT_STEPS = [
    "Initializing specialized agent...",
    "Querying industrial archives...",
    "Cross-referencing patent filings...",
    "Synthesizing disruption vectors...",
    "Generating strategic roadmap..."
];

export default function CustomModelingPage() {
    const [input, setInput] = useState("");
    const [isSimulating, setIsSimulating] = useState(false);
    const [step, setStep] = useState(0);
    const [analysis, setAnalysis] = useState<CustomAnalysis | null>(null);
    const [loading, setLoading] = useState(false);

    const handleRunModeling = async () => {
        if (!input.trim()) return;

        setLoading(true);
        setIsSimulating(true);
        setStep(0);
        setAnalysis(null);

        // Simulation animation
        const interval = setInterval(() => {
            setStep(prev => (prev < AGENT_STEPS.length - 1 ? prev + 1 : prev));
        }, 2000);

        try {
            const res = await fetch("/api/market-intelligence/custom-modeling", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic: input }),
            });

            if (!res.ok) throw new Error("Modeling failed");
            const data = await res.json();

            // Ensure simulation finishes before showing results
            setTimeout(() => {
                setAnalysis(data);
                setIsSimulating(false);
                setLoading(false);
                clearInterval(interval);
            }, 4000);

        } catch (e: any) {
            toast.error(e.message);
            setIsSimulating(false);
            setLoading(false);
            clearInterval(interval);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-emerald-500/30">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 blur-[120px] rounded-full" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 mix-blend-overlay" />
            </div>

            <nav className="relative z-50 p-8 flex justify-between items-center max-w-7xl mx-auto w-full">
                <Link href="/market-intelligence/trends">
                    <Button variant="ghost" className="text-zinc-500 hover:text-white group">
                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back to Trends
                    </Button>
                </Link>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400">
                        Agentic Link Established
                    </span>
                </div>
            </nav>

            <main className="relative z-10 max-w-5xl mx-auto px-8 py-12 flex-1 w-full">
                {!analysis && !isSimulating && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center space-y-12"
                    >
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                <Cpu className="w-3 h-3" /> Custom Intelligence Engine
                            </div>
                            <h1 className="text-6xl font-black text-white tracking-tighter sm:text-7xl">
                                Trend <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Modeling</span>
                            </h1>
                            <p className="text-zinc-500 max-w-xl mx-auto text-lg leading-relaxed">
                                Define a niche, industry shift, or emerging technology. Our agent will perform a targeted scan and generate a bespoke strategic roadmap.
                            </p>
                        </div>

                        <div className="relative max-w-2xl mx-auto">
                            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
                            <div className="relative flex flex-col gap-4 p-2 bg-zinc-900/50 backdrop-blur-3xl rounded-2xl border border-white/10 shadow-2xl">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="e.g. The impact of edge computing on autonomous logistics in APAC..."
                                    className="w-full h-32 bg-transparent p-6 text-white placeholder:text-zinc-700 focus:outline-none resize-none text-xl"
                                />
                                <Button
                                    onClick={handleRunModeling}
                                    disabled={!input.trim()}
                                    className="bg-emerald-500 hover:bg-emerald-400 text-black font-black h-16 rounded-xl text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                                >
                                    <Search className="w-5 h-5" /> Initialize Modeling Signal
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-8 pt-12">
                            {[
                                { icon: Shield, label: "Secure Analysis", sub: "AES-256 Encrypted" },
                                { icon: Globe, label: "Global Reach", sub: "30+ Data Sources" },
                                { icon: Zap, label: "Live Context", sub: "Real-time Signals" }
                            ].map((item, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center mx-auto border border-white/10">
                                        <item.icon className="w-5 h-5 text-zinc-500" />
                                    </div>
                                    <p className="text-xs font-bold text-white uppercase tracking-widest">{item.label}</p>
                                    <p className="text-[10px] text-zinc-600">{item.sub}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Results View */}
                {analysis && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-12"
                    >
                        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/10 pb-12">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20">
                                        Analysis Complete
                                    </span>
                                    {analysis.source === 'cached' && (
                                        <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-[10px] font-bold uppercase tracking-widest border border-orange-500/20 animate-pulse">
                                            Rate Limited // Cached Intel
                                        </span>
                                    )}
                                    {analysis.source === 'live' && (
                                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-widest border border-blue-500/20">
                                            Cloud Connection: Active
                                        </span>
                                    )}
                                    <span className="text-zinc-600 text-[10px] font-mono">ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                                </div>
                                <h1 className="text-5xl font-black text-white tracking-tighter uppercase">
                                    {analysis.topic}
                                </h1>
                            </div>

                            <GlassCard className="p-6 bg-white/5 border-white/10 flex items-center gap-8">
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Sentiment Index</p>
                                    <p className="text-3xl font-black text-white">{analysis.sentiment_index}<span className="text-sm text-zinc-500 font-normal">/100</span></p>
                                </div>
                                <div className="w-px h-10 bg-white/10" />
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Risk Profile</p>
                                    <p className="text-xl font-bold text-orange-400">Moderate</p>
                                </div>
                            </GlassCard>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            {/* Horizon Scan */}
                            <div className="lg:col-span-12">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                                    <Compass className="w-4 h-4" /> Horizon Scan
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {[
                                        { label: "Short Term", content: analysis.horizon_scan.short_term, icon: Zap, color: "text-emerald-400" },
                                        { label: "Medium Term", content: analysis.horizon_scan.medium_term, icon: TrendingUp, color: "text-cyan-400" },
                                        { label: "Long Term", content: analysis.horizon_scan.long_term, icon: Globe, color: "text-purple-400" }
                                    ].map((item, i) => (
                                        <GlassCard key={i} className="p-6 bg-white/[0.02] hover:bg-white/[0.04] transition-colors border-white/5">
                                            <div className={`p-2 rounded-lg bg-white/5 w-fit mb-4 ${item.color}`}>
                                                <item.icon className="w-5 h-5" />
                                            </div>
                                            <h4 className="font-bold text-white mb-2 uppercase tracking-tight">{item.label}</h4>
                                            <p className="text-sm text-zinc-400 leading-relaxed font-light">
                                                {item.content}
                                            </p>
                                        </GlassCard>
                                    ))}
                                </div>
                            </div>

                            {/* Modeled Trends */}
                            <div className="lg:col-span-8 space-y-6">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                                    <Activity className="w-4 h-4" /> Disruption Vectors
                                </h3>
                                {analysis.modeled_trends.map((trend, i) => (
                                    <GlassCard key={i} className="p-8 group">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="space-y-1">
                                                <h4 className="text-2xl font-black text-white group-hover:text-emerald-400 transition-colors">
                                                    {trend.name}
                                                </h4>
                                                <div className="flex gap-2 pt-2">
                                                    {trend.key_drivers.map((driver, k) => (
                                                        <span key={k} className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono">
                                                            {driver}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-zinc-600 uppercase mb-1">Velocity</p>
                                                <span className="text-emerald-400 font-black text-xl italic">{trend.velocity}</span>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-black/40 rounded-2xl border border-white/5 mb-6">
                                            <p className="text-sm text-zinc-300 leading-relaxed italic">
                                                "{trend.impact_narrative}"
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-4 pt-2">
                                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${trend.disruption_potential}%` }}
                                                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                                                />
                                            </div>
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase">
                                                Potential: {trend.disruption_potential}%
                                            </span>
                                        </div>
                                    </GlassCard>
                                ))}
                            </div>

                            {/* Roadmap */}
                            <div className="lg:col-span-4 flex flex-col gap-6">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                                    <LayoutDashboard className="w-4 h-4" /> Strategic Roadmap
                                </h3>
                                {analysis.strategic_roadmap.map((item, i) => (
                                    <div key={i} className="relative pl-8 pb-8 border-l border-zinc-800 last:pb-0 last:border-l-0">
                                        <div className="absolute top-0 left-[-4px] w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">{item.phase}</h4>
                                            <p className="text-white font-medium text-sm leading-snug">{item.action}</p>
                                            <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                                                <p className="text-[9px] font-bold text-orange-400 uppercase mb-1 flex items-center gap-1">
                                                    <Shield className="w-3 h-3" /> Risk Mitigation
                                                </p>
                                                <p className="text-[11px] text-zinc-500 leading-tight">
                                                    {item.risk_mitigation}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <Button
                                    variant="outline"
                                    className="mt-8 border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white h-12"
                                    onClick={() => {
                                        setAnalysis(null);
                                        setInput("");
                                    }}
                                >
                                    Initialize New Model
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </main>

            {/* Simulation State - Moved to root for correct stacking context */}
            <AnimatePresence>
                {isSimulating && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black flex items-center justify-center p-8"
                    >
                        <div className="max-w-md w-full space-y-12 text-center">
                            <div className="relative w-32 h-32 mx-auto">
                                <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full" />
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 border-t-2 border-emerald-500 rounded-full"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Activity className="w-12 h-12 text-emerald-400 animate-pulse" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-2xl font-bold text-white tracking-widest uppercase">
                                    Infiltrating Data Stream
                                </h2>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: "100%" }}
                                        transition={{ duration: 10 }}
                                        className="h-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                                    />
                                </div>
                                <AnimatePresence mode="wait">
                                    <motion.p
                                        key={step}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="text-emerald-500 font-mono text-sm tracking-wider"
                                    >
                                        {">"} {AGENT_STEPS[step]}
                                    </motion.p>
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!isSimulating && (
                <footer className="relative z-10 p-12 text-center text-[10px] text-zinc-600 font-mono tracking-widest uppercase">
                    © {new Date().getFullYear()} Astute Intelligence // Custom Modeling Node Alpha
                </footer>
            )}
        </div>
    );
}
