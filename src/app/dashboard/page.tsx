"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Search,
  Kanban,
  ArrowRight,
  Briefcase,
  Target,
  Zap,
  Activity,
  Undo2,
  Redo2,
  Trash2,
  Loader2,
  HelpCircle,
  Command,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import DealModal from "@/components/DealModal";
import { Deal } from "@/types";
import { GlassCard } from "@/components/ui/GlassCard";
import { DealTrendChart } from "@/components/charts/DealTrendChart";
import { motion } from "framer-motion";

interface DashboardStats {
  totalDeals: number;
  newLeads: number;
  qualified: number;
  contacted: number;
  avgViability: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalDeals: 0,
    newLeads: 0,
    qualified: 0,
    contacted: 0,
    avgViability: 0,
  });
  const [recentDeals, setRecentDeals] = useState<Deal[]>([]);
  const [allDeals, setAllDeals] = useState<Deal[]>([]); // For the chart
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [undoStack, setUndoStack] = useState<Deal[]>([]);
  const [redoStack, setRedoStack] = useState<Deal[]>([]);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/deals");
        if (res.ok) {
          const deals = await res.json();
          setAllDeals(deals);
          setRecentDeals(deals.slice(0, 5));

          // Calculate stats
          const newLeads = deals.filter((d: Deal) => d.status === "new_leads").length;
          const qualified = deals.filter((d: Deal) => d.status === "qualified").length;
          const contacted = deals.filter((d: Deal) => d.status === "contacted").length;
          const scores = deals.map((d: Deal) => d.viabilityScore).filter((s: number | null | undefined): s is number => typeof s === 'number');
          const avgViability = scores.length > 0
            ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
            : 0;

          setStats({
            totalDeals: deals.length,
            newLeads,
            qualified,
            contacted,
            avgViability,
          });
        }
      } catch (error) {
        console.error("Failed to fetch deals:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleDealDeleted = (id: string) => {
    setRecentDeals((prev) => prev.filter((d) => d.id !== id));
    setAllDeals((prev) => prev.filter((d) => d.id !== id));
    // Re-calculate stats
    setStats(prev => ({
      ...prev,
      totalDeals: prev.totalDeals - 1
    }));
  };

  const handleDelete = (id: string) => {
    const dealToDelete = recentDeals.find(d => d.id === id);
    if (dealToDelete) {
      setUndoStack(prev => [...prev, dealToDelete]);
      setRedoStack([]);
      handleDealDeleted(id);
    }
  };

  const handleUndo = async () => {
    if (undoStack.length === 0) return;
    const dealToRestore = undoStack[undoStack.length - 1];

    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dealToRestore),
      });

      if (res.ok) {
        const newDeal = await res.json();
        setRecentDeals(prev => [newDeal, ...prev].slice(0, 5));
        setAllDeals(prev => [newDeal, ...prev]);
        setStats(prev => ({ ...prev, totalDeals: prev.totalDeals + 1 }));
        setUndoStack(prev => prev.slice(0, -1));
        setRedoStack(prev => [...prev, newDeal]);
        toast.success("Restored: " + dealToRestore.name);
      }
    } catch (error) {
      toast.error("Failed to restore deal");
    }
  };

  const handleRedo = async () => {
    if (redoStack.length === 0) return;
    const dealToDelete = redoStack[redoStack.length - 1];

    try {
      const res = await fetch(`/api/deals?id=${dealToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        handleDealDeleted(dealToDelete.id);
        setRedoStack(prev => prev.slice(0, -1));
        setUndoStack(prev => [...prev, dealToDelete]);
        toast.success("Re-deleted: " + dealToDelete.name);
      }
    } catch {
      toast.error("Failed to redo delete");
    }
  };

  const handleTotalReset = async () => {
    const confirmed = window.confirm("Are you sure you want to delete ALL deals? This cannot be undone.");
    if (!confirmed) return;

    setIsResetting(true);
    try {
      const res = await fetch("/api/deals?action=reset", {
        method: "DELETE",
      });

      if (res.ok) {
        setRecentDeals([]);
        setAllDeals([]);
        setStats({ totalDeals: 0, newLeads: 0, qualified: 0, contacted: 0, avgViability: 0 });
        setUndoStack([]);
        setRedoStack([]);
        toast.success("All deals cleared");
      }
    } catch (error) {
      toast.error("Failed to reset deals");
    } finally {
      setIsResetting(false);
    }
  };

  const [initialModalTab, setInitialModalTab] = useState<"overview" | "analysis" | "outreach" | "notes">("overview");

  const openDeal = (deal: Deal, tab: "overview" | "analysis" | "outreach" | "notes" = "overview") => {
    setSelectedDeal(deal);
    setInitialModalTab(tab);
    setIsModalOpen(true);
  };

  const statCards = [
    { label: "Total Deals", value: stats.totalDeals, icon: Briefcase, color: "cyan" },
    { label: "New Leads", value: stats.newLeads, icon: Zap, color: "emerald" },
    { label: "Qualified", value: stats.qualified, icon: Target, color: "amber" },
    { label: "Avg. Viability", value: `${stats.avgViability}%`, icon: TrendingUp, color: "purple" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-6">
      {/* Hero Header */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-blue-500/20 rounded-3xl blur-3xl opacity-50 group-hover:opacity-70 transition-opacity duration-1000 pointer-events-none" />
        <GlassCard className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 border-white/10" intensity="medium">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/20 shadow-inner shadow-cyan-500/10">
              <Sparkles className="w-8 h-8 text-cyan-400" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Astute <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">v3.0</span>
              </h1>
              <p className="text-zinc-400 text-lg font-medium">
                Deal Intelligence & AI Analyst
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {/* Control Bar */}
            <div className="flex items-center gap-1 bg-black/40 border border-white/5 rounded-xl p-1.5 backdrop-blur-md">
              <button
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="p-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Undo Delete (Cmd+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <div className="w-[1px] h-4 bg-white/10" />
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="p-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Redo Delete (Cmd+Shift+Z)"
              >
                <Redo2 className="w-4 h-4" />
              </button>
              <div className="w-[1px] h-4 bg-white/10" />
              <button
                onClick={handleTotalReset}
                disabled={isResetting || stats.totalDeals === 0}
                className="p-2.5 rounded-lg text-red-400/80 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Reset All Data"
              >
                {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>

            <div className="h-8 w-[1px] bg-white/10 hidden sm:block" />

            {/* Primary Action */}
            <Link
              href="/sources"
              className="btn-primary flex items-center justify-center gap-2 h-12 px-8 text-base shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              <Search className="w-4 h-4" />
              New Search
            </Link>
          </div>
        </GlassCard>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Stats & Chart */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <GlassCard
                  key={stat.label}
                  className="p-5 flex flex-col justify-between h-32 group relative overflow-hidden"
                  intensity="low"
                  hoverEffect
                >
                  <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-${stat.color}-400`}>
                    <Icon className="w-16 h-16" />
                  </div>
                  <div className="flex items-center justify-between z-10">
                    <div className={`p-2 rounded-lg bg-${stat.color}-500/10 text-${stat.color}-400`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="z-10">
                    <p className="text-2xl font-bold text-white font-mono">
                      {loading ? <span className="animate-pulse">...</span> : stat.value}
                    </p>
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mt-1">{stat.label}</p>
                  </div>
                </GlassCard>
              );
            })}
          </div>

          {/* Analytics Chart */}
          <GlassCard className="p-6 border-white/5" intensity="medium">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  Deal Viability Trend
                </h3>
                <p className="text-sm text-zinc-400">Average viability scores over time</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 px-2 py-1 rounded bg-white/5">Last 30 Days</span>
              </div>
            </div>
            {loading ? (
              <div className="h-[300px] w-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
              </div>
            ) : (
              <DealTrendChart deals={allDeals} />
            )}
          </GlassCard>
        </div>

        {/* Right Column: Recent Deals & Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <Link href="/pipeline" className="group">
              <GlassCard className="p-4 h-full flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-500/30 transition-colors" intensity="low">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Kanban className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-zinc-300 group-hover:text-emerald-400 transition-colors">Pipeline</span>
              </GlassCard>
            </Link>
            <Link href="/deals" className="group">
              <GlassCard className="p-4 h-full flex flex-col items-center justify-center text-center cursor-pointer hover:border-amber-500/30 transition-colors" intensity="low">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Briefcase className="w-5 h-5 text-amber-400" />
                </div>
                <span className="text-sm font-medium text-zinc-300 group-hover:text-amber-400 transition-colors">All Deals</span>
              </GlassCard>
            </Link>
          </div>

          {/* Recent Deals List */}
          <GlassCard className="p-0 overflow-hidden" intensity="medium">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-white">Recent Activity</h3>
              <Link href="/deals" className="text-xs text-cyan-400 hover:text-cyan-300">View All</Link>
            </div>

            <div className="divide-y divide-white/5">
              {loading ? (
                <div className="p-8 text-center text-zinc-500">Loading...</div>
              ) : recentDeals.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-zinc-500 text-sm">No deals found.</p>
                  <Link href="/sources" className="text-cyan-400 text-xs mt-2 block hover:underline">Start a search</Link>
                </div>
              ) : (
                recentDeals.map((deal) => (
                  <div
                    key={deal.id}
                    onClick={() => openDeal(deal)}
                    className="p-4 hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors line-clamp-1">{deal.name}</h4>
                      <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${(deal.viabilityScore ?? 0) >= 70 ? "bg-emerald-500/10 text-emerald-400" :
                        (deal.viabilityScore ?? 0) >= 50 ? "bg-amber-500/10 text-amber-400" :
                          "bg-zinc-500/10 text-zinc-400"
                        }`}>
                        {deal.viabilityScore ?? "-"}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span>{deal.sourceName || "Unknown Source"}</span>
                      <span>•</span>
                      <span>{deal.industry || "General"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          {/* Support / AI Assistant Teaser */}
          <GlassCard className="p-5 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border-indigo-500/20" intensity="low">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/20">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">AI Assistant Ready</h4>
                <p className="text-xs text-zinc-400 mb-3">
                  Need deep analysis? I can generate full investment memos now.
                </p>
                <button
                  onClick={() => {
                    if (recentDeals.length > 0) {
                      openDeal(recentDeals[0], "analysis");
                    } else {
                      toast.error("No deals available to analyze");
                    }
                  }}
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  Try Deep Dive <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      <DealModal
        deal={selectedDeal}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDelete={handleDelete}
        initialTab={initialModalTab}
        onNext={
          selectedDeal && recentDeals.indexOf(selectedDeal) < recentDeals.length - 1
            ? () => {
              const idx = recentDeals.findIndex((d) => d.id === selectedDeal.id);
              setSelectedDeal(recentDeals[idx + 1]);
            }
            : undefined
        }
        onPrev={
          selectedDeal && recentDeals.indexOf(selectedDeal) > 0
            ? () => {
              const idx = recentDeals.findIndex((d) => d.id === selectedDeal.id);
              setSelectedDeal(recentDeals[idx - 1]);
            }
            : undefined
        }
      />
    </div>
  );
}
