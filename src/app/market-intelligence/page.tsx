"use client";

import { useState, useEffect, useRef } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, TrendingUp, AlertTriangle, CheckCircle, Save, Trash2, RotateCcw, BarChart as ChartIcon, Shield, Globe, Users, Target, Activity, FileDown, Download, MessageSquare, Send, X, Loader2, FileText, Printer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { toast } from "sonner";
import { MarketAnalysis } from "@/lib/gemini";

const COLORS = ['#10b981', '#fbbf24', '#ef4444', '#8b5cf6', '#ec4899'];

type TabKey = "overview" | "dynamics" | "competition" | "strategy" | "battlecards";
type ScenarioKey = "bull_case" | "base_case" | "bear_case";

// Simulation steps for "Live Research"
const RESEARCH_STEPS = [
    "Initializing research agent...",
    "Scanning recent industry reports...",
    "Analyzing competitor 10-K filings...",
    "Cross-referencing market data...",
    "Synthesizing strategic insights..."
];

export default function MarketIntelligencePage() {
    const [input, setInput] = useState("");
    const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState<TabKey>("overview");
    const [scenario, setScenario] = useState<ScenarioKey>("base_case");
    const [showMemo, setShowMemo] = useState(false);

    // Chat State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessage, setChatMessage] = useState("");
    const [chatHistory, setChatHistory] = useState<{ role: string, content: string }[]>([]);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Persistence State
    const [isLoaded, setIsLoaded] = useState(false);

    // Initialize from local storage
    useEffect(() => {
        const savedData = localStorage.getItem("astute_market_intel_session_v4");
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (parsed.input) setInput(parsed.input);
                if (parsed.analysis) setAnalysis(parsed.analysis);
                if (parsed.chatHistory) setChatHistory(parsed.chatHistory);
            } catch (e) {
                console.error("Failed to parse saved session", e);
            }
        }
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem("astute_market_intel_session_v4", JSON.stringify({
            input,
            analysis,
            chatHistory
        }));
    }, [input, analysis, chatHistory, isLoaded]);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory, isChatOpen]);

    const handleAnalyze = async () => {
        if (!input.trim()) return;
        setLoading(true);
        setLoadingStep(0);
        setError("");

        // Simulate research steps
        const stepInterval = setInterval(() => {
            setLoadingStep(prev => (prev < RESEARCH_STEPS.length - 1 ? prev + 1 : prev));
        }, 3000); // 3s per step approx

        try {
            const res = await fetch("/api/market-intelligence", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: input }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to analyze");
            }

            const data = await res.json();
            setAnalysis(data);
            toast.success("Granular Intelligence Analysis Complete");
        } catch (e: any) {
            setError(e.message);
            toast.error("Analysis failed: " + e.message);
        } finally {
            clearInterval(stepInterval);
            setLoading(false);
            setLoadingStep(0);
        }
    };

    const handleChatSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!chatMessage.trim() || !analysis) return;

        const newUserMsg = { role: "user", content: chatMessage };
        setChatHistory(prev => [...prev, newUserMsg]);
        setChatMessage("");
        setIsChatLoading(true);

        try {
            const res = await fetch("/api/market-intelligence/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    analysis,
                    history: chatHistory,
                    message: newUserMsg.content
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setChatHistory(prev => [...prev, { role: "model", content: data.response }]);
        } catch (error) {
            toast.error("Failed to send message");
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleClear = () => {
        const previousInput = input;
        const previousAnalysis = analysis;
        setInput("");
        setAnalysis(null);
        setChatHistory([]);
        localStorage.removeItem("astute_market_intel_session_v4");
        toast.success("Workspace cleared", {
            action: {
                label: "Undo",
                onClick: () => {
                    setInput(previousInput);
                    setAnalysis(previousAnalysis);
                    localStorage.setItem("astute_market_intel_session_v4", JSON.stringify({ input: previousInput, analysis: previousAnalysis }));
                }
            }
        });
    };

    const handleSaveReport = () => {
        if (!analysis) return;
        const report = {
            id: Date.now(),
            date: new Date().toISOString(),
            topic: input.slice(0, 30) + "...",
            analysis
        };
        const existingReports = JSON.parse(localStorage.getItem("astute_saved_reports") || "[]");
        const updatedReports = [report, ...existingReports];
        localStorage.setItem("astute_saved_reports", JSON.stringify(updatedReports));
        toast.success("Report saved to Library");
    };

    const handleExport = () => {
        if (!analysis) return;

        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `market-intel-report-${timestamp}.md`;

        // Generate simplified markdown report
        const content = `
# Market Intelligence Report
**Topic:** ${input}
**Date:** ${new Date().toLocaleDateString()}

## Executive Summary
${analysis.executive_summary.thesis}
- **Horizon:** ${analysis.executive_summary.investment_horizon}
- **Stage:** ${analysis.executive_summary.market_readiness}

## Market Dynamics
- **Market Size:** ${analysis.market_dynamics.market_size}
- **CAGR:** ${analysis.market_dynamics.cagr}

## Competitive Landscape
${analysis.competitive_landscape.map(c => `- **${c.name}** (${c.market_share_estimate}%): Strength: ${c.strength}`).join('\n')}

## SWOT Analysis
**Strengths:**
${analysis.strategic_analysis.swot.strengths.map(s => `- ${s}`).join('\n')}

**Weaknesses:**
${analysis.strategic_analysis.swot.weaknesses.map(s => `- ${s}`).join('\n')}

**Opportunities:**
${analysis.strategic_analysis.swot.opportunities.map(s => `- ${s}`).join('\n')}

**Threats:**
${analysis.strategic_analysis.swot.threats.map(s => `- ${s}`).join('\n')}

## Personas
${analysis.customer_personas.map(p => `- **${p.role}** (WTP: ${p.willingness_to_pay})\n  - ${p.pain_points.join(', ')}`).join('\n')}
        `;

        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Report downloaded");
    };

    const tabs: { key: TabKey, label: string, icon: any }[] = [
        { key: "overview", label: "Overview", icon: Activity },
        { key: "dynamics", label: "Dynamics", icon: TrendingUp },
        { key: "competition", label: "Competition", icon: Users },
        { key: "strategy", label: "Strategy", icon: Target },
        { key: "battlecards", label: "Battlecards", icon: FileText },
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 pb-20 relative">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                        Market Intelligence
                    </h1>
                    <p className="text-zinc-400 mt-2">
                        Analyst-Grade Strategic Deep Dives
                    </p>
                </div>
                <div className="flex gap-2">
                    {analysis && (
                        <>
                            <Button variant="outline" onClick={handleExport} className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
                                <FileDown className="w-4 h-4 mr-2" /> Export
                            </Button>
                            <Button variant="outline" onClick={() => setShowMemo(true)} className="border-zinc-500/30 text-zinc-400 hover:bg-white/10">
                                <Printer className="w-4 h-4 mr-2" /> Memo
                            </Button>
                            <Button variant="outline" onClick={handleClear} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                                <Trash2 className="w-4 h-4 mr-2" /> Clear
                            </Button>
                            <Button onClick={handleSaveReport} className="bg-purple-600 hover:bg-purple-700 text-white">
                                <Save className="w-4 h-4 mr-2" /> Save Report
                            </Button>
                        </>
                    )}
                </div>
            </header>

            <GlassCard className="p-6 transition-all duration-300">
                <div className="flex flex-col gap-4">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Enter a market topic, news URL, or paste report text for deep analysis..."
                        className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                    />
                    <div className="flex justify-end">
                        <Button
                            onClick={handleAnalyze}
                            disabled={loading || !input.trim()}
                            className="bg-purple-600 hover:bg-purple-700 text-white min-w-[140px]"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Deep Diving...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> Run Deep Analysis
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </GlassCard>

            {/* LOADING OVERLAY */}
            <AnimatePresence>
                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center"
                    >
                        <div className="w-full max-w-md space-y-6 text-center">
                            <div className="relative w-20 h-20 mx-auto">
                                <span className="absolute inset-0 border-t-2 border-purple-500 rounded-full animate-spin"></span>
                                <Globe className="w-10 h-10 text-purple-400 absolute inset-0 m-auto animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">Analyzing Market Dynamics</h3>
                                <p className="text-purple-300 animate-pulse">{RESEARCH_STEPS[loadingStep]}</p>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                                <motion.div
                                    className="bg-purple-500 h-full"
                                    initial={{ width: "0%" }}
                                    animate={{ width: `${((loadingStep + 1) / RESEARCH_STEPS.length) * 100}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>


            {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" /> {error}
                </div>
            )}

            {analysis && (
                <div className="space-y-6">
                    {/* Tabs Navigation */}
                    <div className="flex space-x-1 bg-white/5 p-1 rounded-xl w-fit">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
                                    ? "bg-purple-600 text-white shadow-lg"
                                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="w-full"
                        >
                            {/* OVERVIEW TAB */}
                            {activeTab === "overview" && (
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                    {/* Executive Summary Card */}
                                    <GlassCard className="col-span-12 md:col-span-8 p-6 bg-gradient-to-br from-purple-900/10 to-transparent">
                                        <h3 className="text-lg font-semibold text-white mb-4">Executive Summary</h3>
                                        <p className="text-zinc-300 leading-relaxed mb-4">{analysis.executive_summary.thesis}</p>
                                        <div className="flex gap-4">
                                            <div className="bg-white/5 px-3 py-1 rounded-md text-sm text-zinc-400">
                                                Horizon: <span className="text-white">{analysis.executive_summary.investment_horizon}</span>
                                            </div>
                                            <div className="bg-white/5 px-3 py-1 rounded-md text-sm text-zinc-400">
                                                Stage: <span className="text-white">{analysis.executive_summary.market_readiness}</span>
                                            </div>
                                        </div>
                                    </GlassCard>

                                    {/* Key Stats Grid */}
                                    <div className="col-span-12 md:col-span-4 grid grid-cols-2 gap-4">
                                        <GlassCard className="p-4 flex flex-col items-center justify-center text-center">
                                            <span className="text-zinc-500 text-xs uppercase mb-1">Sentiment</span>
                                            <span className={`text-xl font-bold ${analysis.overall_sentiment === "Positive" ? "text-green-400" : "text-yellow-400"}`}>{analysis.overall_sentiment}</span>
                                        </GlassCard>
                                        <GlassCard className="p-4 flex flex-col items-center justify-center text-center">
                                            <span className="text-zinc-500 text-xs uppercase mb-1">Action</span>
                                            <span className="text-xl font-bold text-white">{analysis.recommended_action}</span>
                                        </GlassCard>
                                        <GlassCard className="p-4 flex flex-col items-center justify-center text-center">
                                            <span className="text-zinc-500 text-xs uppercase mb-1">Market Size</span>
                                            <span className="text-lg font-bold text-cyan-400">{analysis.market_dynamics.market_size}</span>
                                        </GlassCard>
                                        <GlassCard className="p-4 flex flex-col items-center justify-center text-center">
                                            <span className="text-zinc-500 text-xs uppercase mb-1">CAGR</span>
                                            <span className="text-lg font-bold text-purple-400">{analysis.market_dynamics.cagr}</span>
                                        </GlassCard>
                                    </div>

                                    {/* PERSONAS GRID */}
                                    <GlassCard className="col-span-12 p-6">
                                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                            <Users className="w-4 h-4 text-pink-400" /> Key Personas
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {analysis.customer_personas.map((persona, i) => (
                                                <div key={i} className="p-4 rounded-lg bg-white/5 border border-white/5">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-pink-200">{persona.role}</h4>
                                                        <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-zinc-400">
                                                            {persona.willingness_to_pay} WTP
                                                        </span>
                                                    </div>
                                                    <ul className="text-sm text-zinc-400 space-y-1">
                                                        {persona.pain_points.map((pt, j) => (
                                                            <li key={j}>• {pt}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </GlassCard>
                                </div>
                            )}

                            {/* DYNAMICS TAB (Scenarios) */}
                            {activeTab === "dynamics" && (
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                    <GlassCard className="col-span-12 p-6">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-lg font-semibold text-white">Market Growth Scenarios</h3>
                                            <div className="flex bg-white/5 rounded-lg p-1">
                                                <button onClick={() => setScenario("bear_case")} className={`px-3 py-1 rounded text-xs font-medium transition-all ${scenario === "bear_case" ? "bg-red-500 text-white" : "text-zinc-400 hover:text-white"}`}>Bear</button>
                                                <button onClick={() => setScenario("base_case")} className={`px-3 py-1 rounded text-xs font-medium transition-all ${scenario === "base_case" ? "bg-blue-500 text-white" : "text-zinc-400 hover:text-white"}`}>Base</button>
                                                <button onClick={() => setScenario("bull_case")} className={`px-3 py-1 rounded text-xs font-medium transition-all ${scenario === "bull_case" ? "bg-green-500 text-white" : "text-zinc-400 hover:text-white"}`}>Bull</button>
                                            </div>
                                        </div>
                                        <div className="h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={analysis.growth_scenarios[scenario]}>
                                                    <defs>
                                                        <linearGradient id="bullGradient" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                        </linearGradient>
                                                        <linearGradient id="baseGradient" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                        </linearGradient>
                                                        <linearGradient id="bearGradient" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                                    <XAxis dataKey="year" stroke="#71717a" />
                                                    <YAxis stroke="#71717a" />
                                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="value"
                                                        stroke={scenario === "bull_case" ? "#10b981" : scenario === "bear_case" ? "#ef4444" : "#3b82f6"}
                                                        fillOpacity={1}
                                                        fill={`url(#${scenario === "bull_case" ? "bullGradient" : scenario === "bear_case" ? "bearGradient" : "baseGradient"})`}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </GlassCard>

                                    <div className="col-span-12 md:col-span-6 space-y-4">
                                        <GlassCard className="p-6 h-full">
                                            <h3 className="text-md font-semibold text-green-400 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Growth Drivers</h3>
                                            <ul className="space-y-2">
                                                {analysis.market_dynamics.growth_drivers.map((d, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500" />
                                                        {d}
                                                    </li>
                                                ))}
                                            </ul>
                                        </GlassCard>
                                    </div>
                                    <div className="col-span-12 md:col-span-6 space-y-4">
                                        <GlassCard className="p-6 h-full">
                                            <h3 className="text-md font-semibold text-red-400 mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Barriers & Hindrances</h3>
                                            <ul className="space-y-2">
                                                {analysis.market_dynamics.hindrances.map((d, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
                                                        {d}
                                                    </li>
                                                ))}
                                            </ul>
                                        </GlassCard>
                                    </div>
                                </div>
                            )}

                            {/* COMPETITION TAB */}
                            {activeTab === "competition" && (
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                    <GlassCard className="col-span-12 lg:col-span-8 p-6">
                                        <h3 className="text-lg font-semibold text-white mb-6">Market Share Estimates (Relative)</h3>
                                        <div className="h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={analysis.competitive_landscape} layout="vertical">
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                                                    <XAxis type="number" stroke="#71717a" hide />
                                                    <YAxis dataKey="name" type="category" stroke="#fff" width={100} tick={{ fontSize: 12 }} />
                                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} cursor={{ fill: 'transparent' }} />
                                                    <Bar dataKey="market_share_estimate" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </GlassCard>

                                    <div className="col-span-12 lg:col-span-4 space-y-4">
                                        {analysis.competitive_landscape.map((comp, i) => (
                                            <GlassCard key={i} className="p-4 border-l-4 border-blue-500">
                                                <div className="flex justify-between items-center mb-1">
                                                    <h4 className="font-bold text-white">{comp.name}</h4>
                                                    <span className="text-xs font-mono text-blue-400">{comp.market_share_estimate}% Est.</span>
                                                </div>
                                                <div className="text-xs space-y-1 mt-2">
                                                    <p className="text-green-400"><span className="text-zinc-500">Strength:</span> {comp.strength}</p>
                                                    <p className="text-red-400"><span className="text-zinc-500">Weakness:</span> {comp.weakness}</p>
                                                </div>
                                            </GlassCard>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* STRATEGY TAB */}
                            {activeTab === "strategy" && (
                                <div className="space-y-6">
                                    {/* SWOT Analysis */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <GlassCard className="p-6 bg-green-500/5 border-green-500/10">
                                            <h3 className="text-green-400 font-bold mb-3 uppercase tracking-wider text-sm">Strengths</h3>
                                            <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1">
                                                {analysis.strategic_analysis.swot.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                            </ul>
                                        </GlassCard>
                                        <GlassCard className="p-6 bg-red-500/5 border-red-500/10">
                                            <h3 className="text-red-400 font-bold mb-3 uppercase tracking-wider text-sm">Weaknesses</h3>
                                            <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1">
                                                {analysis.strategic_analysis.swot.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
                                            </ul>
                                        </GlassCard>
                                        <GlassCard className="p-6 bg-blue-500/5 border-blue-500/10">
                                            <h3 className="text-blue-400 font-bold mb-3 uppercase tracking-wider text-sm">Opportunities</h3>
                                            <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1">
                                                {analysis.strategic_analysis.swot.opportunities.map((s, i) => <li key={i}>{s}</li>)}
                                            </ul>
                                        </GlassCard>
                                        <GlassCard className="p-6 bg-yellow-500/5 border-yellow-500/10">
                                            <h3 className="text-yellow-400 font-bold mb-3 uppercase tracking-wider text-sm">Threats</h3>
                                            <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1">
                                                {analysis.strategic_analysis.swot.threats.map((s, i) => <li key={i}>{s}</li>)}
                                            </ul>
                                        </GlassCard>
                                    </div>

                                    {/* Regulatory & Risks */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <GlassCard className="p-6">
                                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Shield className="w-4 h-4" /> Regulatory Landscape</h3>
                                            <p className="text-sm text-zinc-400 leading-relaxed">{analysis.regulatory_landscape}</p>
                                        </GlassCard>

                                        <GlassCard className="p-6">
                                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-400" /> Key Risks</h3>
                                            <div className="space-y-3">
                                                {analysis.risks.map((risk, i) => (
                                                    <div key={i} className="flex items-start justify-between text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                                        <span className="text-zinc-300">{risk.risk}</span>
                                                        <span className={`px-2 py-0.5 rounded textxs ${risk.impact === "High" ? "bg-red-500/20 text-red-300" : "bg-yellow-500/20 text-yellow-300"
                                                            }`}>{risk.impact}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </GlassCard>
                                    </div>

                                    {/* Opportunities List - Detailed */}
                                    <GlassCard className="p-6">
                                        <h3 className="text-lg font-semibold text-white mb-4">Strategic Opportunities</h3>
                                        <div className="grid grid-cols-1 gap-4">
                                            {analysis.opportunities.map((opp, i) => (
                                                <div key={i} className="p-4 rounded-lg bg-white/5 border border-white/5">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-lg text-white">{opp.title}</h4>
                                                        <span className="px-2 py-1 bg-white/10 rounded text-xs text-zinc-400">{opp.difficulty} Implementation</span>
                                                    </div>
                                                    <p className="text-sm text-zinc-400">{opp.thesis}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </GlassCard>
                                </div>
                            )}

                            {/* BATTLECARDS TAB */}
                            {activeTab === "battlecards" && (
                                <div className="grid grid-cols-1 gap-6">
                                    <GlassCard className="p-6">
                                        <h3 className="text-xl font-bold text-white mb-6">Competitive Battlecards</h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-white/10">
                                                        <th className="p-4 text-sm font-semibold text-zinc-400">Dimension</th>
                                                        {analysis.competitive_landscape.map((comp, i) => (
                                                            <th key={i} className="p-4 text-sm font-bold text-white">{comp.name}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    <tr>
                                                        <td className="p-4 text-sm text-zinc-400 font-medium">Market Share</td>
                                                        {analysis.competitive_landscape.map((comp, i) => (
                                                            <td key={i} className="p-4 text-sm text-white">{comp.market_share_estimate}%</td>
                                                        ))}
                                                    </tr>
                                                    <tr>
                                                        <td className="p-4 text-sm text-zinc-400 font-medium">Key Strength</td>
                                                        {analysis.competitive_landscape.map((comp, i) => (
                                                            <td key={i} className="p-4 text-sm text-green-400">{comp.strength}</td>
                                                        ))}
                                                    </tr>
                                                    <tr>
                                                        <td className="p-4 text-sm text-zinc-400 font-medium">Key Weakness</td>
                                                        {analysis.competitive_landscape.map((comp, i) => (
                                                            <td key={i} className="p-4 text-sm text-red-400">{comp.weakness}</td>
                                                        ))}
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </GlassCard>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* FLOATING CHAT WIDGET */}
                    <div className="fixed bottom-8 right-8 z-40">
                        <AnimatePresence>
                            {isChatOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                                    className="absolute bottom-16 right-0 w-[350px] bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                                    style={{ height: '500px' }}
                                >
                                    {/* Chat Header */}
                                    <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            <span className="font-semibold text-white text-sm">Analyst Connection</span>
                                        </div>
                                        <button onClick={() => setIsChatOpen(false)} className="text-zinc-400 hover:text-white">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Chat Messages */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                        {chatHistory.length === 0 && (
                                            <div className="text-center text-zinc-500 text-sm mt-20">
                                                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                <p>Ask me anything about this report.</p>
                                                <p className="text-xs">"What is the biggest risk?"</p>
                                                <p className="text-xs">"Explain the bull case."</p>
                                            </div>
                                        )}
                                        {chatHistory.map((msg, i) => (
                                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${msg.role === 'user'
                                                    ? 'bg-purple-600 text-white rounded-br-none'
                                                    : 'bg-white/10 text-zinc-200 rounded-bl-none'
                                                    }`}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        ))}
                                        {isChatLoading && (
                                            <div className="flex justify-start">
                                                <div className="bg-white/10 rounded-2xl p-3 rounded-bl-none flex gap-1">
                                                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </div>
                                            </div>
                                        )}
                                        <div ref={chatEndRef} />
                                    </div>

                                    {/* Chat Input */}
                                    <form onSubmit={handleChatSubmit} className="p-3 border-t border-white/10 bg-white/5">
                                        <div className="flex gap-2">
                                            <input
                                                value={chatMessage}
                                                onChange={(e) => setChatMessage(e.target.value)}
                                                placeholder="Ask a follow-up..."
                                                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                                            />
                                            <button
                                                type="submit"
                                                disabled={!chatMessage.trim() || isChatLoading}
                                                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white p-2 rounded-xl transition-colors"
                                            >
                                                <Send className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.button
                            onClick={() => setIsChatOpen(!isChatOpen)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-lg shadow-purple-900/50 flex items-center gap-2"
                        >
                            {isChatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                            {!isChatOpen && <span className="font-semibold pr-1">Ask Analyst</span>}
                        </motion.button>
                    </div>
                </div>
            )}

            {/* MEMO MODAL */}
            <AnimatePresence>
                {showMemo && analysis && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 z-[100] overflow-y-auto p-4 md:p-8"
                    >
                        <div className="max-w-4xl mx-auto bg-white text-black p-12 min-h-screen shadow-2xl relative" id="print-area">
                            <button
                                onClick={() => setShowMemo(false)}
                                className="absolute top-4 right-16 p-2 rounded-full hover:bg-gray-100 text-gray-500 print:hidden"
                            >
                                <X className="w-6 h-6" />
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="absolute top-4 right-4 p-2 rounded-full bg-black text-white hover:bg-zinc-800 print:hidden"
                            >
                                <Printer className="w-6 h-6" />
                            </button>

                            {/* MEMO CONTENT */}
                            <div className="space-y-8 font-serif">
                                <header className="border-b-2 border-black pb-4 mb-8">
                                    <h1 className="text-3xl font-bold uppercase tracking-widest mb-2">Investment Memorandum</h1>
                                    <div className="grid grid-cols-2 text-sm text-gray-600">
                                        <p><strong>TO:</strong> Investment Committee</p>
                                        <p><strong>FROM:</strong> Astute Intelligence</p>
                                        <p><strong>DATE:</strong> {new Date().toLocaleDateString()}</p>
                                        <p><strong>SUBJECT:</strong> Strategic Analysis of {input}</p>
                                    </div>
                                </header>

                                <section>
                                    <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 uppercase">1. Executive Summary</h2>
                                    <p className="leading-relaxed text-gray-800 text-lg mb-4">{analysis.executive_summary.thesis}</p>
                                    <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 border border-gray-200">
                                        <div>
                                            <span className="block text-xs uppercase text-gray-500">Horizon</span>
                                            <span className="font-bold">{analysis.executive_summary.investment_horizon}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs uppercase text-gray-500">Readiness</span>
                                            <span className="font-bold">{analysis.executive_summary.market_readiness}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs uppercase text-gray-500">Sentiment</span>
                                            <span className="font-bold">{analysis.overall_sentiment}</span>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 uppercase">2. Market Dynamics</h2>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <h3 className="font-bold mb-2">Market Sizing</h3>
                                            <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                <li><strong>TAM:</strong> {analysis.market_dynamics.market_size}</li>
                                                <li><strong>CAGR:</strong> {analysis.market_dynamics.cagr}</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h3 className="font-bold mb-2">Growth Drivers</h3>
                                            <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                {analysis.market_dynamics.growth_drivers.slice(0, 3).map((d, i) => <li key={i}>{d}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 uppercase">3. Competitive Landscape</h2>
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-300">
                                                <th className="pb-2 font-bold">Company</th>
                                                <th className="pb-2 font-bold">Est. Share</th>
                                                <th className="pb-2 font-bold">Strategic Strength</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {analysis.competitive_landscape.map((comp, i) => (
                                                <tr key={i}>
                                                    <td className="py-2 font-medium">{comp.name}</td>
                                                    <td className="py-2">{comp.market_share_estimate}%</td>
                                                    <td className="py-2 text-gray-600">{comp.strength}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </section>

                                <section>
                                    <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 uppercase">4. Recommendation</h2>
                                    <div className="bg-black text-white p-6">
                                        <h3 className="text-2xl font-bold mb-2 uppercase">{analysis.recommended_action}</h3>
                                        <p className="text-gray-300 text-sm">Based on current market conditions and competitive positioning.</p>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
