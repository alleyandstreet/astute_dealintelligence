"use client";

import React, { useState, useEffect } from "react";
import {
    Zap,
    ArrowLeft,
    Trash2,
    Video,
    FileText,
    MessageSquare,
    Layers,
    Search,
    Calendar,
    ArrowUpRight,
    Loader2,
    Database,
    Clock,
    Flame
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Toaster, toast } from "sonner";
import { useContentState } from "@/components/ContentStateProvider";

const formatIcons: any = {
    reel: Video,
    linkedin: FileText,
    thread: MessageSquare,
    carousel: Layers
};

export default function ScriptLibraryPage() {
    const router = useRouter();
    const { restoreBlueprint } = useContentState();
    const [scripts, setScripts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchScripts();
    }, []);

    const fetchScripts = async () => {
        try {
            const res = await fetch("/api/marketing/saved");
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setScripts(data);
        } catch (e: any) {
            toast.error("Failed to load library: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this script?")) return;
        try {
            const res = await fetch(`/api/marketing/saved?id=${id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setScripts(scripts.filter(s => s.id !== id));
            toast.success("Script removed from library");
        } catch (e: any) {
            toast.error("Delete failed: " + e.message);
        }
    };

    const handleRestore = (script: any) => {
        restoreBlueprint(script);
        toast.success("Script restored to Command Center!");
        router.push("/marketing/outliner");
    };

    const filteredScripts = scripts.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.prompt.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#020202] text-white p-6 md:p-12">
            <Toaster position="top-right" theme="dark" />

            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4">
                        <Link href="/marketing/outliner" className="inline-flex items-center text-zinc-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest">
                            <ArrowLeft className="w-3 h-3 mr-2" /> Back to Lab
                        </Link>
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                                <Database className="w-8 h-8" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-extrabold tracking-tighter uppercase italic">Script Library</h1>
                                <p className="text-zinc-500 font-medium">Your persistent repository of viral architectures.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-cyan-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search blueprints..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="bg-zinc-900/50 border border-white/5 rounded-2xl pl-12 pr-6 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all w-64"
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="h-[400px] flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
                        <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">Accessing Archives...</p>
                    </div>
                ) : filteredScripts.length === 0 ? (
                    <div className="h-[400px] bg-zinc-900/20 border border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center text-center p-12">
                        <Zap className="w-12 h-12 text-zinc-800 mb-6" />
                        <h3 className="text-xl font-black text-zinc-600 uppercase tracking-widest">Archives Empty</h3>
                        <p className="text-zinc-700 max-w-sm mt-4 font-medium">
                            Architect a script in the Command Center and save it to see it appear here.
                        </p>
                        <Link href="/marketing/outliner" className="mt-8 px-8 py-3 bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all border border-white/5">
                            Open Command Center
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredScripts.map((s) => {
                            const Icon = formatIcons[s.format] || Zap;
                            return (
                                <div key={s.id} className="group bg-zinc-900/40 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-3xl hover:border-cyan-500/30 transition-all relative overflow-hidden flex flex-col h-full">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="p-3 rounded-xl bg-black border border-white/5 text-zinc-500 group-hover:text-cyan-400 group-hover:border-cyan-500/20 transition-all">
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleDelete(s.id)}
                                                className="p-2.5 rounded-xl bg-black border border-white/5 text-zinc-800 hover:text-red-500 hover:border-red-500/20 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4 flex-1">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-white/5">
                                                    {s.format}
                                                </span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">
                                                    <Flame className="w-3 h-3" /> {s.outline.metaData.estimatedViralScore}%
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-black tracking-tight leading-tight group-hover:text-cyan-400 transition-colors">
                                                {s.title}
                                            </h3>
                                        </div>

                                        <p className="text-xs text-zinc-500 line-clamp-2 italic">
                                            "{s.prompt}"
                                        </p>

                                        <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-600">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3 h-3" />
                                                {new Date(s.createdAt).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Layers className="w-3 h-3" />
                                                {s.outline.structure.length} Scenes
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleRestore(s)}
                                        className="mt-8 w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
                                    >
                                        Restore to Lab <ArrowUpRight className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
