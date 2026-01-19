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
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Astute Dashboard</h1>
          <p className="text-[var(--text-muted)]">Real-time private equity deal intelligence and insights.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[var(--card)] border border-[var(--border)] rounded-lg p-1">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="p-2 hover:bg-[var(--background)] rounded text-[var(--text-muted)] disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo Delete"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-2 hover:bg-[var(--background)] rounded text-[var(--text-muted)] disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo Delete"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleTotalReset}
            disabled={isResetting || stats.totalDeals === 0}
            className="btn-outline flex items-center gap-2 text-red-400 border-red-500/20 hover:bg-red-500/10 h-[42px]"
          >
            {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Total Reset
          </button>

          <Link
            href="/sources"
            className="btn-primary flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            New Search
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg bg-${stat.color}-500/10 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 text-${stat.color}-400`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                {loading ? "--" : stat.value}
              </p>
              <p className="text-sm text-[var(--text-muted)]">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link
          href="/sources"
          className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-xl p-6 hover:border-cyan-500/40 transition-all group"
        >
          <Search className="w-8 h-8 text-cyan-400 mb-4" />
          <h3 className="font-semibold text-white mb-2">Start Search</h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Configure subreddits and keywords to find deals
          </p>
          <span className="text-cyan-400 text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
            Configure <ArrowRight className="w-4 h-4" />
          </span>
        </Link>

        <Link
          href="/pipeline"
          className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-6 hover:border-green-500/40 transition-all group"
        >
          <Kanban className="w-8 h-8 text-green-400 mb-4" />
          <h3 className="font-semibold text-white mb-2">View Pipeline</h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Manage and track deals through your pipeline
          </p>
          <span className="text-green-400 text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
            Open <ArrowRight className="w-4 h-4" />
          </span>
        </Link>

        <Link
          href="/deals"
          className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-6 hover:border-amber-500/40 transition-all group"
        >
          <Activity className="w-8 h-8 text-amber-400 mb-4" />
          <h3 className="font-semibold text-white mb-2">Browse Deals</h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            View and filter all discovered deals
          </p>
          <span className="text-amber-400 text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
            Browse <ArrowRight className="w-4 h-4" />
          </span>
        </Link>

        <Link
          href="/support"
          className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20 rounded-xl p-6 hover:border-indigo-500/40 transition-all group"
        >
          <HelpCircle className="w-8 h-8 text-indigo-400 mb-4" />
          <h3 className="font-semibold text-white mb-2">Support & Intel</h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            FAQs, Tips & AI Platform Assistant
          </p>
          <span className="text-indigo-400 text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
            Learn More <ArrowRight className="w-4 h-4" />
          </span>
        </Link>
      </div>

      {/* Recent Deals */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Recent Deals</h2>
          <Link href="/deals" className="text-cyan-400 text-sm hover:text-cyan-300">
            View All →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-16 rounded-lg" />
            ))}
          </div>
        ) : recentDeals.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 text-[var(--text-dim)] mx-auto mb-4" />
            <p className="text-[var(--text-muted)] mb-2">No deals yet</p>
            <p className="text-sm text-[var(--text-dim)]">
              Start a search to discover opportunities
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentDeals.map((deal) => (
              <button
                key={deal.id}
                onClick={() => openDeal(deal)}
                className="w-full flex items-center justify-between p-4 rounded-lg bg-[var(--background)] hover:bg-[var(--card-hover)] transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${(deal.viabilityScore ?? 0) >= 70 ? "bg-green-400" :
                    (deal.viabilityScore ?? 0) >= 50 ? "bg-amber-400" : "bg-zinc-400"
                    }`} />
                  <div>
                    <p className="font-medium text-white line-clamp-1">{deal.name}</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {deal.sourceName || "Reddit"} • {deal.industry || "Unknown"} • {deal.revenue || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm text-cyan-400">
                    {deal.viabilityScore ?? "--"}%
                  </p>
                  <p className="text-xs text-[var(--text-dim)]">Viability</p>
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
