"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AdminLayout from "@/components/AdminLayout";
import { Settings, Plus, Save, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Config {
    id: string;
    name: string;
    subreddits: string;
    keywords: string;
    isDefault: boolean;
    createdAt: string;
}

export default function AdminConfigPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [configs, setConfigs] = useState<Config[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [newConfig, setNewConfig] = useState({
        name: "",
        subreddits: "SaaS, startups, Entrepreneur, buyingsellingsbe",
        keywords: "buying, selling, revenue, ebitda, valuation",
        isDefault: false
    });

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated" && (session?.user as any)?.role !== "super_admin") {
            router.push("/");
        }
    }, [status, session, router]);

    useEffect(() => {
        if ((session?.user as any)?.role === "super_admin") {
            fetchConfigs();
        }
    }, [session]);

    const fetchConfigs = async () => {
        try {
            const res = await fetch("/api/admin/config");
            if (res.ok) {
                const data = await res.json();
                setConfigs(data.configs);
            }
        } catch (error) {
            console.error("Error fetching configs:", error);
            toast.error("Failed to fetch configurations");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/admin/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newConfig),
            });

            if (res.ok) {
                toast.success("Scanner configuration updated");
                setShowNewModal(false);
                setNewConfig({ name: "", subreddits: "", keywords: "", isDefault: false });
                fetchConfigs();
            } else {
                toast.error("Failed to save configuration");
            }
        } catch (error) {
            console.error("Error saving config:", error);
            toast.error("Failed to save configuration");
        }
    };

    if (status === "loading" || loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-white font-mono animate-pulse uppercase tracking-widest text-xs">Accessing Config Volatile Memory...</div>
            </div>
        );
    }

    return (
        <AdminLayout>
            <div className="max-w-5xl">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Scanner Intelligence Configuration</h1>
                        <p className="text-slate-400">Define search parameters for Reddit deal-flow analysis</p>
                    </div>
                    <button
                        onClick={() => setShowNewModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                    >
                        <Plus size={20} />
                        Deploy New Config
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {configs.map((config) => (
                        <div key={config.id} className={`bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/50 transition-all relative overflow-hidden group ${config.isDefault ? 'border-l-4 border-l-cyan-500' : ''}`}>
                            {config.isDefault && (
                                <div className="absolute top-0 right-0 p-4">
                                    <div className="bg-cyan-500/10 text-cyan-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-cyan-500/20">
                                        ACTIVE PRIMARY CONFIG
                                    </div>
                                </div>
                            )}

                            <div className="mb-6 flex items-center gap-4">
                                <div className="p-3 bg-slate-900 rounded-xl group-hover:scale-110 transition-transform">
                                    <Settings className="text-cyan-400" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{config.name}</h3>
                                    <p className="text-slate-500 text-xs font-mono uppercase tracking-tighter">Deployed on {new Date(config.createdAt).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-2">
                                        Target Subreddits
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {config.subreddits.split(',').map((sub, i) => (
                                            <span key={i} className="bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700/50 text-white text-sm">
                                                r/{sub.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-2">
                                        Intelligence Keywords
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {config.keywords.split(',').map((word, i) => (
                                            <span key={i} className="bg-cyan-500/5 px-3 py-1.5 rounded-lg border border-cyan-500/10 text-cyan-400 text-sm italic font-medium">
                                                #{word.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {showNewModal && (
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-slate-700/50 rounded-3xl p-8 max-w-lg w-full shadow-2xl">
                            <h2 className="text-2xl font-bold text-white mb-6">Setup New Pulse Config</h2>
                            <form onSubmit={handleCreateConfig} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase mb-2">Config Identity</label>
                                    <input
                                        type="text"
                                        value={newConfig.name}
                                        onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-all"
                                        placeholder="e.g. Q1 SaaS Aggressive Search"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase mb-2">Target Subreddits (comma separated)</label>
                                    <textarea
                                        value={newConfig.subreddits}
                                        onChange={(e) => setNewConfig({ ...newConfig, subreddits: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-all h-24"
                                        placeholder="SaaS, startups..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase mb-2">Intelligence Keywords (comma separated)</label>
                                    <textarea
                                        value={newConfig.keywords}
                                        onChange={(e) => setNewConfig({ ...newConfig, keywords: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-all h-24"
                                        placeholder="buying, selling, ebitda..."
                                        required
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="isDefault"
                                        checked={newConfig.isDefault}
                                        onChange={(e) => setNewConfig({ ...newConfig, isDefault: e.target.checked })}
                                        className="w-5 h-5 rounded-lg accent-cyan-500"
                                    />
                                    <label htmlFor="isDefault" className="text-slate-400 text-sm cursor-pointer select-none">Set as Primary Active Configuration</label>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="submit"
                                        className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                                    >
                                        Deploy Configuration
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowNewModal(false)}
                                        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all"
                                    >
                                        Abort
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
