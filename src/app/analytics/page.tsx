"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, TrendingUp, Briefcase, Target, BarChart3 } from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    Legend,
} from "recharts";

import { Deal } from "@/types";

const COLORS = ["#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

function AnalyticsContent() {
    const searchParams = useSearchParams();
    const sourceParam = searchParams.get("source");
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDeals();
    }, []);

    const fetchDeals = async () => {
        try {
            const res = await fetch("/api/deals");
            if (res.ok) {
                const data = await res.json();
                setDeals(data);
            }
        } catch (error) {
            console.error("Failed to fetch deals:", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter deals based on source if present
    const filteredDeals = sourceParam
        ? deals.filter(d => d.source?.toLowerCase() === sourceParam.toLowerCase() || (sourceParam === 'reddit' && !d.source))
        : deals;

    // Calculate analytics on filtered deals
    const industryData = filteredDeals.reduce((acc: Record<string, number>, deal) => {
        const industry = deal.industry || "Other";
        acc[industry] = (acc[industry] || 0) + 1;
        return acc;
    }, {});

    const industryChartData = Object.entries(industryData).map(([name, value]) => ({
        name,
        value,
    }));

    const qualityData = [
        { name: "High (70+)", value: filteredDeals.filter((d) => (d.viabilityScore ?? 0) >= 70).length },
        { name: "Medium (50-69)", value: filteredDeals.filter((d) => (d.viabilityScore ?? 0) >= 50 && (d.viabilityScore ?? 0) < 70).length },
        { name: "Low (<50)", value: filteredDeals.filter((d) => (d.viabilityScore ?? 0) < 50).length },
    ];

    const statusData = [
        { name: "New", value: filteredDeals.filter((d) => d.status === "new_leads").length },
        { name: "Qualified", value: filteredDeals.filter((d) => d.status === "qualified").length },
        { name: "Contacted", value: filteredDeals.filter((d) => d.status === "contacted").length },
        { name: "Discussion", value: filteredDeals.filter((d) => d.status === "in_discussion").length },
        { name: "DD", value: filteredDeals.filter((d) => d.status === "due_diligence").length },
    ];

    // Subreddit/Topic performance
    const subredditData = filteredDeals.reduce((acc: Record<string, { count: number; avgScore: number }>, deal) => {
        const source = deal.sourceName || "Unknown";
        if (!acc[source]) acc[source] = { count: 0, avgScore: 0 };
        acc[source].count++;
        acc[source].avgScore += deal.viabilityScore ?? 0;
        return acc;
    }, {});

    const subredditChartData = Object.entries(subredditData)
        .map(([name, data]) => ({
            name,
            deals: data.count,
            avgScore: Math.round(data.avgScore / data.count) || 0,
        }))
        .sort((a, b) => b.deals - a.deals)
        .slice(0, 5);

    // Stats
    const avgViability = filteredDeals.length > 0
        ? Math.round(filteredDeals.reduce((acc, d) => acc + (d.viabilityScore ?? 0), 0) / filteredDeals.length)
        : 0;
    const avgMotivation = filteredDeals.length > 0
        ? Math.round(filteredDeals.reduce((acc, d) => acc + (d.motivationScore ?? 0), 0) / filteredDeals.length)
        : 0;
    const hotDeals = filteredDeals.filter((d) => (d.viabilityScore ?? 0) >= 70 && (d.motivationScore ?? 0) >= 60).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                    {sourceParam === 'producthunt'
                        ? 'ProductHunt Analytics'
                        : sourceParam === 'indiehustle'
                            ? 'IndieHustle Analytics'
                            : sourceParam === 'reddit'
                                ? 'Reddit Analytics'
                                : 'Unified Analytics'}
                </h1>
                <p className="text-sm sm:text-base text-[var(--text-muted)]">
                    {sourceParam === 'producthunt'
                        ? 'Deep dive into ProductHunt launch metrics and trends.'
                        : sourceParam === 'indiehustle'
                            ? 'Insights from IndieHustle newsletters and deal flow.'
                            : 'Insights from Reddit conversations and deal flow.'}
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-cyan-400" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{filteredDeals.length}</p>
                    <p className="text-sm text-[var(--text-muted)]">Total Deals</p>
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{avgViability}%</p>
                    <p className="text-sm text-[var(--text-muted)]">Avg. Viability</p>
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <Target className="w-5 h-5 text-amber-400" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{avgMotivation}%</p>
                    <p className="text-sm text-[var(--text-muted)]">Avg. Motivation</p>
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-red-400" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{hotDeals}</p>
                    <p className="text-sm text-[var(--text-muted)]">Hot Deals</p>
                </div>
            </div>

            {/* Charts Grid - Continuation passed to parent */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

                {/* Industry Distribution */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
                    <h3 className="font-semibold text-white mb-4">Deals by Industry</h3>
                    {industryChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={industryChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {industryChartData.map((_, index) => (
                                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: "var(--card)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "8px",
                                    }}
                                    itemStyle={{ color: "white" }}
                                    labelStyle={{ color: "white" }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-[var(--text-dim)]">
                            No data yet
                        </div>
                    )}
                </div>

                {/* Quality Distribution */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
                    <h3 className="font-semibold text-white mb-4">Deal Quality Distribution</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={qualityData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                            <YAxis stroke="var(--text-muted)" fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    background: "var(--card)",
                                    border: "1px solid var(--border)",
                                    borderRadius: "8px",
                                }}
                                itemStyle={{ color: "white" }}
                                labelStyle={{ color: "white" }}
                            />
                            <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Pipeline Status */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
                    <h3 className="font-semibold text-white mb-4">Pipeline Status</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={statusData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                            <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={12} width={80} />
                            <Tooltip
                                contentStyle={{
                                    background: "var(--card)",
                                    border: "1px solid var(--border)",
                                    borderRadius: "8px",
                                }}
                                itemStyle={{ color: "white" }}
                                labelStyle={{ color: "white" }}
                            />
                            <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Subreddit Performance */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
                    <h3 className="font-semibold text-white mb-4">Top {sourceParam === 'producthunt' ? 'Makers' : 'Subreddits'}</h3>
                    {subredditChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={subredditChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        background: "var(--card)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "8px",
                                    }}
                                    itemStyle={{ color: "white" }}
                                    labelStyle={{ color: "white" }}
                                />
                                <Bar dataKey="deals" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Deals" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-[var(--text-dim)]">
                            No data yet
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function AnalyticsPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>}>
            <AnalyticsContent />
        </Suspense>
    );
}
