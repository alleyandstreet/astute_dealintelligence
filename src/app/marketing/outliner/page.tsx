"use client";

import React, { useState, useEffect } from "react";
import {
    Sparkles,
    Zap,
    Search,
    ArrowLeft,
    RefreshCw,
    X,
    Copy,
    CheckCircle2,
    Trash2,
    Video,
    FileText,
    MessageSquare,
    Layers,
    Play,
    Mic,
    Type,
    Radar,
    Flame,
    ArrowRight,
    BrainCircuit,
    Target,
    Activity,
    Trophy,
    Globe,
    Cpu,
    Save
} from "lucide-react";
import Link from "next/link";
import { Toaster, toast } from "sonner";
import { useContentState } from "@/components/ContentStateProvider";
import { useRouter } from "next/navigation";

const formats = [
    { id: 'reel', label: 'Viral Reel', icon: Video, description: 'Visual script for short video' },
    { id: 'linkedin', label: 'LinkedIn', icon: FileText, description: 'Structured value post' },
    { id: 'thread', label: 'X Thread', icon: MessageSquare, description: 'Sequential storytelling' },
    { id: 'carousel', label: 'Carousel', icon: Layers, description: 'Slide-by-slide strategy' }
];

export default function ScriptLabPage() {
    const router = useRouter();
    const { labState, setLabState, resetLab, setGeneratorState } = useContentState();

    const [prompt, setPrompt] = useState(labState.prompt);
    const [format, setFormat] = useState(labState.format);
    const [persona, setPersona] = useState(labState.persona);
    const [loading, setLoading] = useState(false);
    const [surferLoading, setSurferLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [blueprint, setBlueprint] = useState(labState.blueprint);
    const [outline, setOutline] = useState(labState.outline);
    const [thinking, setThinking] = useState(labState.thinking || "");

    // Sync to global
    useEffect(() => {
        setLabState({ prompt, format, persona, blueprint, outline, thinking });
    }, [prompt, format, persona, blueprint, outline, thinking, setLabState]);

    const handleReset = () => {
        resetLab();
        setPrompt("");
        setFormat('reel');
        setPersona("Professional");
        setBlueprint(null);
        setOutline(null);
        setThinking("");
        toast.success("Command Center cleared");
    };

    const handleSurf = async () => {
        if (!prompt.trim()) return;
        setSurferLoading(true);
        setBlueprint(null);
        setThinking("Initializing Research Agent...");
        try {
            const res = await fetch("/api/marketing/surf", {
                method: "POST",
                body: JSON.stringify({ topic: prompt })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setBlueprint(data);
            setThinking(data.thinking || "");
            toast.success("Viral Intelligence Synchronized!");
        } catch (e: any) {
            toast.error(e.message);
            setThinking("");
        } finally {
            setSurferLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        try {
            const res = await fetch("/api/marketing/outline", {
                method: "POST",
                body: JSON.stringify({ prompt, format, persona })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setOutline(data);
            toast.success(`${format.charAt(0).toUpperCase() + format.slice(1)} Architected!`);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!outline || !blueprint) {
            toast.error("Nothing to save. Research and Architect a script first!");
            return;
        }

        setSaveLoading(true);
        try {
            const res = await fetch("/api/marketing/saved", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: outline.title,
                    prompt,
                    format,
                    persona,
                    thinking,
                    blueprint,
                    outline
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            toast.success("Blueprint saved to library!");
        } catch (e: any) {
            toast.error("Failed to save: " + e.message);
        } finally {
            setSaveLoading(false);
        }
    };

    const moveToEngine = () => {
        if (!outline) return;
        setGeneratorState(prev => ({
            ...prev,
            input: outline.title + ": " + outline.hook,
            step: 1
        }));
        router.push("/marketing");
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white p-4 md:p-8 selection:bg-cyan-500/30">
            <Toaster position="top-right" theme="dark" />

            <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* LEFT CONSOLE: INPUTS & SETTINGS */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-6 backdrop-blur-3xl">
                        <Link href="/marketing" className="flex items-center text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors mb-8">
                            <ArrowLeft className="w-3 h-3 mr-2" /> Content Engine
                        </Link>

                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                                <Cpu className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black tracking-tighter uppercase italic">Lab v2.0</h1>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active System</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3 block">Topic / Idea</label>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Enter your spark..."
                                    className="w-full h-32 bg-black border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all resize-none placeholder:text-zinc-800"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1 block">Architecture Format</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {formats.map((f) => {
                                        const Icon = f.icon;
                                        const active = format === f.id;
                                        return (
                                            <button
                                                key={f.id}
                                                onClick={() => setFormat(f.id as any)}
                                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${active
                                                    ? "bg-white text-black border-white"
                                                    : "bg-black text-zinc-500 border-white/5 hover:border-white/20"
                                                    }`}
                                            >
                                                <Icon className="w-4 h-4" />
                                                <span className="text-[8px] font-black uppercase tracking-widest">{f.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5 flex gap-3">
                                <button
                                    onClick={handleSurf}
                                    disabled={surferLoading || !prompt.trim()}
                                    className="flex-1 py-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-20"
                                >
                                    {surferLoading ? <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" /> : <Radar className="w-4 h-4 text-cyan-400" />}
                                    Research
                                </button>
                                <button
                                    onClick={handleGenerate}
                                    disabled={loading || !prompt.trim()}
                                    className="flex-1 py-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-20 shadow-lg shadow-cyan-600/20"
                                >
                                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                    Architect
                                </button>
                            </div>

                            <button onClick={handleReset} className="w-full text-center text-[10px] font-bold text-zinc-600 hover:text-red-400 transition-colors uppercase tracking-widest pt-2">
                                Reset Command Center
                            </button>
                        </div>
                    </div>

                    {/* THINKING AGENT OVERLAY */}
                    {thinking && (
                        <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-6 backdrop-blur-3xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4">
                                <BrainCircuit className="w-12 h-12 text-zinc-800" />
                            </div>
                            <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <div className="w-1 h-1 bg-cyan-400 rounded-full animate-ping" /> Agentic Logic
                            </h3>
                            <p className="text-xs text-zinc-400 leading-relaxed font-medium italic">
                                "{thinking}"
                            </p>
                        </div>
                    )}
                </div>

                {/* MAIN STAGE: INTELLIGENCE & PRODUCTION */}
                <div className="lg:col-span-9 space-y-6">

                    {/* SYSTEM HUD */}
                    <div className="bg-zinc-900/20 border border-white/5 rounded-3xl p-8 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-12">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Viral Score</p>
                                <p className="text-2xl font-black tracking-tighter">{outline ? `${outline.metaData.estimatedViralScore}%` : '--'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Ease of Production</p>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <div key={s} className={`w-3 h-1.5 rounded-full ${outline?.metaData.easeOfProduction >= s ? 'bg-cyan-500' : 'bg-zinc-800'}`} />
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Niche Saturation</p>
                                <p className="text-xs font-bold text-zinc-400">OPTIMAL RANGE</p>
                            </div>
                        </div>

                        {outline && (
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleSave}
                                    disabled={saveLoading}
                                    className="bg-zinc-800 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-zinc-700 transition-all border border-white/5"
                                >
                                    {saveLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save to Library
                                </button>
                                <button onClick={moveToEngine} className="bg-white text-black px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl">
                                    Push to Engine <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                        {/* VIRAL INTELLIGENCE COLUMN */}
                        <div className="space-y-6">
                            {!blueprint && !surferLoading && (
                                <div className="h-[400px] bg-zinc-900/10 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center p-8">
                                    <Target className="w-8 h-8 text-zinc-800 mb-4" />
                                    <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest underline decoration-dotted">Radar Offline</p>
                                </div>
                            )}

                            {surferLoading && (
                                <div className="h-[400px] bg-zinc-900/20 rounded-3xl p-8 space-y-6 animate-pulse">
                                    <div className="h-4 bg-zinc-800 rounded-full w-1/3" />
                                    <div className="space-y-3">
                                        <div className="h-20 bg-zinc-800 rounded-2xl" />
                                        <div className="h-20 bg-zinc-800 rounded-2xl" />
                                    </div>
                                </div>
                            )}

                            {blueprint && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-8 space-y-8 h-full">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-sm font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                                                <Flame className="w-4 h-4" /> Market Synthesis
                                            </h2>
                                            <Globe className="w-4 h-4 text-zinc-700" />
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Trending Hooks v2</p>
                                                <div className="grid gap-4">
                                                    {blueprint.trendingHooks.map((h: any, idx: number) => (
                                                        <div key={idx} className="bg-black/50 border border-white/5 p-5 rounded-2xl group hover:border-cyan-500/30 transition-all">
                                                            <p className="text-sm font-bold italic mb-3">"{h.hook}"</p>
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-[8px] px-2 py-1 rounded bg-zinc-800 text-zinc-400 font-black uppercase tracking-widest">{h.type}</span>
                                                                <span className="text-[8px] text-emerald-500 font-black uppercase tracking-widest flex items-center gap-1.5">
                                                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> {h.avgEngagement} Engagement
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {blueprint.viralGeometry && (
                                                <div className="pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                                                    <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                                                        <Activity className="w-4 h-4 text-cyan-500 mb-2" />
                                                        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Peak Retention</p>
                                                        <p className="text-xs font-bold text-white">{blueprint.viralGeometry.peakRetentionTime}</p>
                                                    </div>
                                                    <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                                                        <Play className="w-4 h-4 text-cyan-500 mb-2" />
                                                        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Format Meta</p>
                                                        <p className="text-xs font-bold text-white line-clamp-1">{blueprint.viralGeometry.optimalFormat}</p>
                                                    </div>
                                                </div>
                                            )}

                                            <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                                                {blueprint.analysis}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* PRODUCTION SCRIPT COLUMN */}
                        <div className="space-y-6">
                            {!outline && !loading && (
                                <div className="h-[600px] bg-zinc-900/10 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center p-8">
                                    <Sparkles className="w-10 h-10 text-zinc-800 mb-4" />
                                    <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">Directing Spec Offline</p>
                                </div>
                            )}

                            {loading && (
                                <div className="h-[600px] bg-zinc-900/20 rounded-3xl p-8 space-y-8 animate-pulse">
                                    <div className="h-8 bg-zinc-800 rounded-full w-1/2" />
                                    <div className="space-y-6">
                                        <div className="h-32 bg-zinc-800 rounded-3xl" />
                                        <div className="h-32 bg-zinc-800 rounded-3xl" />
                                        <div className="h-32 bg-zinc-800 rounded-3xl" />
                                    </div>
                                </div>
                            )}

                            {outline && (
                                <div className="bg-[#0c0c0c] border border-white/10 rounded-3xl overflow-hidden shadow-2xl h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-700">
                                    <div className="p-8 bg-zinc-900/50 border-b border-white/5 flex flex-col gap-2 relative overflow-hidden">
                                        <Trophy className="absolute top-0 right-0 w-24 h-24 text-white opacity-[0.02] -translate-y-4 translate-x-4" />
                                        <div className="flex items-center gap-3">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-cyan-500">Architecture Mode</span>
                                            <div className="h-px flex-1 bg-white/5" />
                                        </div>
                                        <h2 className="text-2xl font-black tracking-tight leading-tight">{outline.title}</h2>
                                        {outline.metaData.seoKeywords && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {outline.metaData.seoKeywords.map((k: string) => (
                                                    <span key={k} className="text-[8px] font-black text-zinc-600">#{k}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 overflow-y-auto max-h-[700px] custom-scrollbar">
                                        <div className="p-8 border-b border-white/5 bg-zinc-900/10">
                                            <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widests mb-3">Winning Hook</p>
                                            <h3 className="text-xl font-extrabold italic text-white leading-relaxed">
                                                "{outline.hook}"
                                            </h3>
                                        </div>

                                        <div className="divide-y divide-white/5">
                                            {outline.structure.map((s: any, idx: number) => (
                                                <div key={idx} className="p-8 space-y-6 group hover:bg-white/[0.02] transition-colors">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-500 group-hover:text-cyan-400 group-hover:bg-cyan-400/10 transition-colors">
                                                                {idx + 1}
                                                            </div>
                                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{s.stage}</h4>
                                                        </div>
                                                        <Activity className="w-3 h-3 text-zinc-800" />
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pl-9">
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-2 text-[8px] font-black text-zinc-700 uppercase tracking-widest">
                                                                <Play className="w-2 h-2" /> Visual Strategy
                                                            </div>
                                                            <p className="text-xs text-zinc-300 font-medium leading-relaxed">{s.visual}</p>
                                                        </div>
                                                        {(s.audio || s.text) && (
                                                            <div className="space-y-3">
                                                                {s.audio && (
                                                                    <>
                                                                        <div className="flex items-center gap-2 text-[8px] font-black text-zinc-700 uppercase tracking-widest">
                                                                            <Mic className="w-2 h-2" /> Audio Cues
                                                                        </div>
                                                                        <p className="text-xs text-zinc-300 font-medium leading-relaxed mb-4">{s.audio}</p>
                                                                    </>
                                                                )}
                                                                {s.text && (
                                                                    <>
                                                                        <div className="flex items-center gap-2 text-[8px] font-black text-pink-500/80 uppercase tracking-widest">
                                                                            <Type className="w-2 h-2" /> Overlay Text
                                                                        </div>
                                                                        <p className="text-sm text-white font-black leading-relaxed">{s.text}</p>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-8 bg-zinc-900/50 border-t border-white/5 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Final Conversion (CTA)</p>
                                            <p className="text-sm font-bold text-white">{outline.cta}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(JSON.stringify(outline, null, 2));
                                                toast.success("Design Spec Copied!");
                                            }}
                                            className="p-3 rounded-xl bg-white/5 text-zinc-600 hover:text-white transition-all border border-white/5"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
