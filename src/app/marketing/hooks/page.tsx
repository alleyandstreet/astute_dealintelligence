"use client";

import React, { useState } from "react";
import {
    Sparkles,
    ArrowLeft,
    RefreshCw,
    X,
    Copy,
    CheckCircle2,
    Trash2
} from "lucide-react";
import Link from "next/link";
import { Toaster, toast } from "sonner";
import { useContentState } from "@/components/ContentStateProvider";
import { useEffect } from "react";

export default function HookLabPage() {
    const { hookLabState, setHookLabState, resetHookLab } = useContentState();

    const [hookInput, setHookInput] = useState(hookLabState.hookInput);
    const [generatedHooks, setGeneratedHooks] = useState<any[]>(hookLabState.generatedHooks);
    const [isHookLoading, setIsHookLoading] = useState(false);
    const [persona, setPersona] = useState(hookLabState.persona);

    // Sync to global state
    useEffect(() => {
        setHookLabState({
            hookInput,
            persona,
            generatedHooks
        });
    }, [hookInput, persona, generatedHooks, setHookLabState]);

    const handleReset = () => {
        if (confirm("Clear all generated hooks and start over?")) {
            resetHookLab();
            setHookInput("");
            setGeneratedHooks([]);
            setPersona("Professional");
            toast.success("Hook Lab reset");
        }
    };

    const handleGenerateHooks = async () => {
        if (!hookInput.trim()) return;
        setIsHookLoading(true);
        setGeneratedHooks([]);

        try {
            const res = await fetch("/api/marketing/hooks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ caption: hookInput, persona })
            });

            const data = await res.json();
            if (data.hooks) {
                setGeneratedHooks(data.hooks);
                toast.success("Viral hooks generated!");
            } else {
                toast.error(data.error || "Failed to generate hooks");
            }
        } catch (e) {
            console.error(e);
            toast.error("Network error");
        } finally {
            setIsHookLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Hook copied to clipboard!");
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12">
            <Toaster position="top-right" theme="dark" />

            <div className="max-w-6xl mx-auto space-y-12">
                {/* Header */}
                <div className="flex flex-col gap-6">
                    <Link href="/marketing" className="inline-flex items-center text-zinc-500 hover:text-white transition-colors w-fit">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Generator
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-500">
                                    <Sparkles className="w-8 h-8" />
                                </div>
                                <div>
                                    <h1 className="text-4xl md:text-5xl font-bold bg-white text-transparent bg-clip-text w-fit tracking-tight leading-tight">
                                        Hook Lab
                                    </h1>
                                    <p className="text-zinc-400 max-w-xl text-lg leading-relaxed mt-1">
                                        Optimize your content for viral impact with psychology-driven hooks.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Persona Selector */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Brand Voice</label>
                            <div className="flex bg-zinc-900/50 p-1.5 rounded-2xl border border-white/10 gap-1 backdrop-blur-sm">
                                {["Professional", "Witty", "Storyteller", "Bold"].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPersona(p)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${persona === p
                                            ? "bg-white text-black shadow-xl"
                                            : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    {/* Left: Input */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                            <div className="relative bg-zinc-900/40 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 block">Your Content Idea</label>
                                <textarea
                                    value={hookInput}
                                    onChange={(e) => setHookInput(e.target.value)}
                                    placeholder="Paste your messy thoughts, rough draft, or specific topic here..."
                                    className="w-full h-80 bg-black/40 border border-white/10 rounded-2xl p-6 text-base text-white focus:outline-none focus:ring-2 focus:ring-pink-500/30 transition-all resize-none font-mono placeholder:text-zinc-700"
                                />
                                <div className="flex gap-4 mt-6">
                                    <button
                                        onClick={handleGenerateHooks}
                                        disabled={isHookLoading || !hookInput.trim()}
                                        className="flex-1 py-4 rounded-xl bg-white text-black font-extrabold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:scale-100 shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2"
                                    >
                                        {isHookLoading ? (
                                            <>
                                                <RefreshCw className="w-5 h-5 animate-spin" />
                                                Analyzing Virality...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-5 h-5" />
                                                Optimize for Scroll-Stop
                                            </>
                                        )}
                                    </button>

                                    {(hookInput || generatedHooks.length > 0) && (
                                        <button
                                            onClick={handleReset}
                                            className="p-4 rounded-xl bg-zinc-900 border border-white/5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
                                            title="Clear All"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Results */}
                    <div className="lg:col-span-7 space-y-6">
                        {!generatedHooks.length && !isHookLoading && (
                            <div className="h-[500px] flex flex-col items-center justify-center text-center p-12 bg-zinc-900/20 border border-dashed border-white/5 rounded-3xl">
                                <div className="p-6 rounded-3xl bg-white/5 border border-white/5 mb-6">
                                    <Sparkles className="w-10 h-10 text-zinc-600" />
                                </div>
                                <h3 className="text-xl font-bold text-zinc-400">Ready for Optimization</h3>
                                <p className="text-sm text-zinc-600 max-w-xs mt-2 italic">
                                    "Behind every viral post is a hook that refused to be ignored."
                                </p>
                            </div>
                        )}

                        {isHookLoading && (
                            <div className="space-y-6">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-32 bg-zinc-900/40 rounded-3xl border border-white/5 animate-pulse" />
                                ))}
                            </div>
                        )}

                        <div className="space-y-6">
                            {generatedHooks.map((h, i) => (
                                <div
                                    key={i}
                                    className="group relative bg-[#111] border border-white/5 rounded-3xl p-8 hover:border-pink-500/40 hover:bg-[#151515] transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
                                    style={{ animationDelay: `${i * 100}ms` }}
                                >
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <span className="px-3 py-1 rounded-full bg-pink-500/10 text-pink-400 text-[10px] font-black uppercase tracking-widest border border-pink-500/20">
                                                {h.type}
                                            </span>
                                            <button
                                                onClick={() => copyToClipboard(h.hook)}
                                                className="p-2 rounded-xl bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
                                                title="Copy Hook"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            <h4 className="text-xl md:text-2xl font-bold text-white leading-tight italic group-hover:text-pink-100 transition-colors pr-8">
                                                "{h.hook}"
                                            </h4>
                                            <p className="text-sm text-zinc-500 leading-relaxed font-medium">
                                                {h.explanation}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
