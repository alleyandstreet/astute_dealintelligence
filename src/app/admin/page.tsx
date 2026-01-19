"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AdminLayout from "@/components/AdminLayout";
import { Users, Activity, TrendingUp, Building2, BarChart3, PieChart as PieIcon, Zap, HelpCircle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function AdminDashboard() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        recentActivity: 0,
    });

    const [systemInfo, setSystemInfo] = useState<any>(null);
    const [analytics, setAnalytics] = useState<any>(null);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated" && (session?.user as any)?.role !== "super_admin") {
            router.push("/");
        }
    }, [status, session, router]);

    useEffect(() => {
        if ((session?.user as any)?.role === "super_admin") {
            fetchStats();
            fetchSystemInfo();
            fetchAnalytics();
        }
    }, [session]);

    const fetchStats = async () => {
        try {
            const [usersRes, logsRes] = await Promise.all([
                fetch("/api/admin/users"),
                fetch("/api/admin/logs?limit=100"),
            ]);

            if (usersRes.ok && logsRes.ok) {
                const usersData = await usersRes.json();
                const logsData = await logsRes.json();

                setStats({
                    totalUsers: usersData.users.length,
                    activeUsers: usersData.users.filter((u: any) => u.isActive).length,
                    recentActivity: logsData.total,
                });
            }
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    const fetchSystemInfo = async () => {
        try {
            const res = await fetch("/api/admin/system");
            if (res.ok) {
                const data = await res.json();
                setSystemInfo(data);
            }
        } catch (error) {
            console.error("Error fetching system info:", error);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const res = await fetch("/api/admin/analytics");
            if (res.ok) {
                const data = await res.json();
                setAnalytics(data);
            }
        } catch (error) {
            console.error("Error fetching analytics:", error);
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    if ((session?.user as any)?.role !== "super_admin") {
        return null;
    }

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const formatCurrency = (amount: number) => {
        if (!amount) return "$0";
        if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
        if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
        return `$${amount}`;
    };

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse shadow-[0_0_10px_purple]"></div>
                            <span className="text-xs font-mono text-purple-400 uppercase tracking-widest font-bold">Encrypted CTO Channel</span>
                        </div>
                        <h1 className="text-5xl font-extrabold text-white tracking-tight">Super Admin Dashboard</h1>
                        <p className="text-slate-400 mt-2 text-lg">Central Intelligence Hub for PE Deal Pipeline</p>
                    </div>
                </div>

                {/* Primary Stats Radar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {[
                        { label: "Total Users", value: stats.totalUsers, icon: Users, color: "cyan" },
                        { label: "Active Nodes", value: stats.activeUsers, icon: TrendingUp, color: "green" },
                        { label: "Activity Index", value: stats.recentActivity, icon: Activity, color: "purple" },
                        { label: "Total Assets", value: systemInfo?.database?.businessCount || 0, icon: Building2, color: "yellow" }
                    ].map((card, i) => (
                        <div key={i} className={`bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-7 shadow-2xl hover:bg-slate-800/60 transition-all border-l-4 border-l-${card.color}-500 group`}>
                            <div className="flex items-center justify-between">
                                <div className={`p-4 bg-${card.color}-500/10 rounded-2xl group-hover:scale-110 transition-transform`}>
                                    <card.icon className={`text-${card.color}-400`} size={28} />
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{card.label}</p>
                                    <p className="text-white text-4xl font-black">{card.value}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Deal Performance Matrix */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <div className="w-1.5 h-8 bg-cyan-500 rounded-full shadow-[0_0_15px_#06b6d4]"></div>
                                    Deal Quality Radar
                                </h2>
                                {analytics?.financials?._sum?.valuationMin && (
                                    <div className="bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 rounded-xl">
                                        <p className="text-[10px] text-cyan-500 uppercase font-black">Total Pipeline Value</p>
                                        <p className="text-white font-mono font-bold">{formatCurrency(analytics.financials._sum.valuationMin)}</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col md:flex-row gap-8 mb-10">
                                <div className="flex-1 grid grid-cols-2 gap-4">
                                    {analytics?.dealsByStatus?.map((s: any, i: number) => (
                                        <div key={i} className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/40 hover:border-cyan-500/30 transition-all">
                                            <p className="text-xs text-slate-500 uppercase font-bold mb-2 truncate">{s.status.replace(/_/g, ' ')}</p>
                                            <p className="text-3xl font-black text-white">{s._count.id}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="h-48 w-full md:w-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={analytics?.dealsByStatus?.map((s: any) => ({ name: s.status, value: s._count.id })) || []}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={60}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {analytics?.dealsByStatus?.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={['#06b6d4', '#22c55e', '#a855f7', '#eab308'][index % 4]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                                itemStyle={{ color: '#fff', fontSize: '12px' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/50">
                                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Execution Power Tools</h3>
                                    <div className="space-y-4">
                                        {[
                                            { label: "User Management", path: "/admin/users", icon: Users, desc: "Team IDs & Passwords", color: "cyan" },
                                            { label: "Business Directory", path: "/admin/businesses", icon: Building2, desc: "Global Asset Ledger", color: "green" },
                                            { label: "Scanner Config", path: "/admin/config", icon: Activity, desc: "Subreddits & Keywords", color: "yellow" },
                                            { label: "Support & Intel Hub", path: "/admin/support", icon: HelpCircle, desc: "FAQs, Tips & AI Assistant", color: "indigo" },
                                            { label: "Forensic Audit", path: "/admin/logs", icon: Activity, desc: "Deep Activity Tracking", color: "purple" }
                                        ].map((tool, i) => (
                                            <button
                                                key={i}
                                                onClick={() => router.push(tool.path)}
                                                className={`w-full group p-4 bg-slate-800/50 hover:bg-${tool.color}-500/10 border border-slate-700/30 hover:border-${tool.color}-500/40 rounded-xl flex items-center justify-between transition-all`}
                                            >
                                                <div className="flex items-center gap-4 text-left">
                                                    <div className={`p-2.5 bg-slate-900 rounded-lg group-hover:text-${tool.color}-400 transition-colors`}>
                                                        <tool.icon size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold group-hover:text-white">{tool.label}</p>
                                                        <p className="text-slate-500 text-xs">{tool.desc}</p>
                                                    </div>
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className={`w-2 h-2 bg-${tool.color}-500 rounded-full animate-ping`}></div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/50">
                                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">User Activity Radar</h3>
                                    <div className="space-y-5">
                                        {analytics?.topUsers?.map((u: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-colors">
                                                        {u.username.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className="text-white font-medium group-hover:translate-x-1 transition-transform">{u.username}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-1.5 w-16 bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-cyan-500"
                                                            style={{ width: `${Math.min(100, (u.count / (analytics.topUsers[0].count || 1)) * 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs font-mono text-slate-500">{u.count}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Infrastructure & Network Health */}
                    <div className="space-y-8">
                        <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
                            <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-green-500 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.5)]"></div>
                                System Backend Core
                            </h2>

                            {systemInfo ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { label: "Runtime", value: `v${systemInfo.system.nodeVersion.replace('v', '')}` },
                                            { label: "Memory", value: `${Math.round((systemInfo.system.freeMemory / systemInfo.system.totalMemory) * 100)}% Free` },
                                            { label: "Platform", value: systemInfo.system.platform },
                                            { label: "Uptime", value: `${Math.floor(systemInfo.system.uptime / 3600)}h active` }
                                        ].map((info, i) => (
                                            <div key={i} className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/50">
                                                <p className="text-[10px] uppercase font-black text-slate-600 mb-1">{info.label}</p>
                                                <p className="text-white font-mono text-sm">{info.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-slate-900/80 p-6 rounded-2xl border border-cyan-500/10 shadow-[inner_0_0_20px_rgba(6,182,212,0.05)]">
                                        <h4 className="text-cyan-500/70 mb-4 uppercase font-black text-[10px] tracking-widest">Active Scanner Monitor</h4>
                                        <div className="space-y-3">
                                            {analytics?.recentScans?.length > 0 ? (
                                                analytics.recentScans.map((scan: any, i: number) => (
                                                    <div key={i} className="flex justify-between items-center text-[11px] font-mono border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                                                        <span className="text-slate-500">{new Date(scan.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        <span className={`px-2 py-0.5 rounded ${scan.status === 'completed' ? 'text-green-400 bg-green-400/10' : 'text-yellow-400 bg-yellow-400/10'}`}>
                                                            {scan.status.toUpperCase()}
                                                        </span>
                                                        <span className="text-white/70">+{scan.dealsFound} Deals</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-center text-slate-600 text-xs py-4">Scanning system idle...</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-indigo-500/5 border border-indigo-500/20 p-5 rounded-2xl">
                                        <div className="flex items-center gap-3 mb-3 text-indigo-400">
                                            <div className="p-2 bg-indigo-500/20 rounded-lg">
                                                <Activity size={18} />
                                            </div>
                                            <span className="text-xs font-bold uppercase tracking-wider">Health Assessment</span>
                                        </div>
                                        <div className="space-y-2">
                                            {[
                                                { label: "Database Engine", status: "Operational", color: "text-green-400" },
                                                { label: "Network Gateway", status: "Connected", color: "text-green-400" },
                                                { label: "AI Translation", status: "Enabled", color: "text-green-400" }
                                            ].map((h, i) => (
                                                <div key={i} className="flex justify-between text-[11px]">
                                                    <span className="text-slate-500">{h.label}</span>
                                                    <span className={h.color}>{h.status}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-20 gap-4">
                                    <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                                    <p className="text-slate-500 font-mono text-sm uppercase animate-pulse">Establishing Connection...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
