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
} from "lucide-react";
import { toast } from "sonner";
import DealModal from "@/components/DealModal";
import { Deal } from "@/types";

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

  const openDeal = (deal: Deal) => {
    setSelectedDeal(deal);
    setIsModalOpen(true);
  };

  const statCards = [
    { label: "Total Deals", value: stats.totalDeals, icon: Briefcase, color: "cyan" },
    { label: "New Leads", value: stats.newLeads, icon: Zap, color: "green" },
    { label: "Qualified", value: stats.qualified, icon: Target, color: "amber" },
    { label: "Avg. Viability", value: `${stats.avgViability}%`, icon: TrendingUp, color: "purple" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-3xl opacity-50" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-8 rounded-2xl glass-strong border border-white/10">
          <div className="fade-in">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              <span className="gradient-text">Astute Dashboard</span>
            </h1>
            <p className="text-base text-[var(--text-muted)] max-w-xl leading-relaxed">
              Real-time private equity deal intelligence and insights powered by AI
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 slide-in-right">
            <div className="flex items-center bg-[var(--card)] border border-[var(--border)] rounded-lg p-1">
              <button
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="p-2 hover:bg-[var(--background)] rounded text-[var(--text-muted)] hover:text-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Undo Delete"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="p-2 hover:bg-[var(--background)] rounded text-[var(--text-muted)] hover:text-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Redo Delete"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleTotalReset}
              disabled={isResetting || stats.totalDeals === 0}
              className="btn-outline flex items-center gap-2 text-red-400 border-red-500/20 hover:bg-red-500/10 h-[40px] px-3 text-sm"
            >
              {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span className="hidden xs:inline">Reset</span>
            </button>

            <Link
              href="/sources"
              className="btn-primary flex items-center gap-2 h-[40px] px-4 text-sm"
            >
              <Search className="w-4 h-4" />
              New Search
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="card-premium group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-${stat.color}-500/20 to-${stat.color}-600/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-6 h-6 text-${stat.color}-400`} />
                  </div>
                  <div className={`w-2 h-2 rounded-full bg-${stat.color}-400 animate-pulse`} />
                </div>
                <p className="text-3xl font-bold text-white mb-2 font-mono">
                  {loading ? (
                    <span className="shimmer inline-block w-16 h-8 rounded" />
                  ) : (
                    stat.value
                  )}
                </p>
                <p className="text-sm text-[var(--text-muted)] font-medium">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link
          href="/sources"
          className="group relative bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-2xl p-6 hover:border-cyan-500/40 transition-all overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <Search className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="font-bold text-white mb-2 text-lg">Start Search</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4 leading-relaxed">
              Configure subreddits and keywords to find deals
            </p>
            <span className="text-cyan-400 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
              Configure <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </Link>

        <Link
          href="/pipeline"
          className="group relative bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-2xl p-6 hover:border-green-500/40 transition-all overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <Kanban className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="font-bold text-white mb-2 text-lg">View Pipeline</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4 leading-relaxed">
              Manage and track deals through your pipeline
            </p>
            <span className="text-green-400 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
              Open <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </Link>

        <Link
          href="/deals"
          className="group relative bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-6 hover:border-amber-500/40 transition-all overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <Activity className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="font-bold text-white mb-2 text-lg">Browse Deals</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4 leading-relaxed">
              View and filter all discovered deals
            </p>
            <span className="text-amber-400 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
              Browse <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </Link>

        <Link
          href="/support"
          className="group relative bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20 rounded-2xl p-6 hover:border-indigo-500/40 transition-all overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <HelpCircle className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="font-bold text-white mb-2 text-lg">Support & Intel</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4 leading-relaxed">
              FAQs, Tips & AI Platform Assistant
            </p>
            <span className="text-indigo-400 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
              Learn More <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </Link>
      </div>

      {/* Recent Deals */}
      <div className="glass-strong rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-cyan-400" />
            Recent Deals
          </h2>
          <Link href="/deals" className="text-cyan-400 text-sm hover:text-cyan-300 font-medium transition-colors flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-20 rounded-xl" />
            ))}
          </div>
        ) : recentDeals.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-cyan-400" />
            </div>
            <p className="text-[var(--text-muted)] mb-2 font-medium">No deals yet</p>
            <p className="text-sm text-[var(--text-dim)]">
              Start a search to discover opportunities
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentDeals.map((deal) => (
              <button
                key={deal.id}
                onClick={() => openDeal(deal)}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-[var(--card)]/50 hover:bg-[var(--card)] border border-[var(--border)] hover:border-cyan-500/30 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${(deal.viabilityScore ?? 0) >= 70 ? "bg-green-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]" :
                    (deal.viabilityScore ?? 0) >= 50 ? "bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "bg-zinc-400"
                    } group-hover:scale-125 transition-transform`} />
                  <div>
                    <p className="font-semibold text-white line-clamp-1 group-hover:text-cyan-400 transition-colors">{deal.name}</p>
                    <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                      <span>{deal.sourceName || "Reddit"}</span>
                      <span className="w-1 h-1 rounded-full bg-[var(--text-dim)]" />
                      <span>{deal.industry || "Unknown"}</span>
                      <span className="w-1 h-1 rounded-full bg-[var(--text-dim)]" />
                      <span>{deal.revenue || "N/A"}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-bold text-cyan-400">
                    {deal.viabilityScore ?? "--"}%
                  </p>
                  <p className="text-xs text-[var(--text-dim)] uppercase tracking-wider">Viability</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <DealModal
        deal={selectedDeal}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDelete={handleDelete}
      />
    </div>
  );
}
