"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Loader2, ExternalLink, TrendingUp, AlertTriangle, RotateCcw, Undo2, Redo2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import DealModal from "@/components/DealModal";

interface Deal {
    id: string;
    name: string;
    description?: string;
    industry?: string;
    revenue?: number;
    revenueType?: string;
    valuationMin?: number;
    valuationMax?: number;
    viabilityScore?: number;
    motivationScore?: number;
    dealQuality?: number;
    aiSummary?: string;
    redditAuthor?: string;
    redditUrl?: string;
    riskFlags?: string;
    sellerSignals?: string;
    status: string;
    createdAt: string;
    contactReddit?: string;
}

function formatCurrency(value: number | undefined): string {
    if (!value) return "N/A";
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
}

export default function DealsPage() {
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [industryFilter, setIndustryFilter] = useState<string>("all");
    const [minScore, setMinScore] = useState<number>(0);
    const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [undoStack, setUndoStack] = useState<Deal[]>([]);
    const [redoStack, setRedoStack] = useState<Deal[]>([]);
    const [isResetting, setIsResetting] = useState(false);

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

    const openDeal = (deal: Deal) => {
        setSelectedDeal(deal);
        setIsModalOpen(true);
    };

    const handleStatusChange = (id: string, status: string) => {
        setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
        if (selectedDeal?.id === id) {
            setSelectedDeal({ ...selectedDeal, status });
        }
    };

    const handleDelete = (id: string) => {
        const dealToDelete = deals.find(d => d.id === id);
        if (dealToDelete) {
            setUndoStack(prev => [...prev, dealToDelete]);
            setRedoStack([]); // Clear redo on new action
            setDeals(prev => prev.filter(d => d.id !== id));
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
                setDeals(prev => [newDeal, ...prev]);
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
                setDeals(prev => prev.filter(d => d.id !== dealToDelete.id));
                setRedoStack(prev => prev.slice(0, -1));
                setUndoStack(prev => [...prev, dealToDelete]);
                toast.success("Re-deleted: " + dealToDelete.name);
            }
        } catch (error) {
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
                setDeals([]);
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

    const industries = [...new Set(deals.map((d) => d.industry).filter(Boolean))];

    const filteredDeals = deals.filter((deal) => {
        if (searchQuery && !deal.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        if (industryFilter !== "all" && deal.industry !== industryFilter) {
            return false;
        }
        if ((deal.viabilityScore ?? 0) < minScore) {
            return false;
        }
        return true;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Browse Deals</h1>
                    <p className="text-[var(--text-muted)]">
                        {filteredDeals.length} of {deals.length} deals
                    </p>
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
                        disabled={isResetting || deals.length === 0}
                        className="btn-outline flex items-center gap-2 text-red-400 border-red-500/20 hover:bg-red-500/10"
                    >
                        {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Total Reset
                    </button>

                    <Link href="/sources" className="btn-primary flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        New Search
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-6 flex flex-wrap gap-4">
                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-dim)]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search deals..."
                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-[var(--text-dim)] focus:border-cyan-500 focus:outline-none"
                        />
                    </div>
                </div>

                {/* Industry filter */}
                <select
                    value={industryFilter}
                    onChange={(e) => setIndustryFilter(e.target.value)}
                    className="bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                >
                    <option value="all">All Industries</option>
                    {industries.map((ind) => (
                        <option key={ind} value={ind!}>
                            {ind}
                        </option>
                    ))}
                </select>

                {/* Score filter */}
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="text-sm text-[var(--text-muted)]">Min Score:</span>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={minScore}
                        onChange={(e) => setMinScore(parseInt(e.target.value))}
                        className="w-24"
                    />
                    <span className="text-sm text-cyan-400 font-mono w-8">{minScore}</span>
                </div>
            </div>

            {/* Deals Grid */}
            {filteredDeals.length === 0 ? (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
                    <Search className="w-12 h-12 text-[var(--text-dim)] mx-auto mb-4" />
                    <p className="text-[var(--text-muted)] mb-2">No deals found</p>
                    <p className="text-sm text-[var(--text-dim)]">
                        Try adjusting your filters or start a new search
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredDeals.map((deal) => {
                        const riskFlags = deal.riskFlags ? JSON.parse(deal.riskFlags) : [];
                        const isHot = (deal.motivationScore ?? 0) >= 80;

                        return (
                            <div
                                key={deal.id}
                                onClick={() => openDeal(deal)}
                                className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border-light)] transition-all cursor-pointer"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`px-2 py-1 rounded-md text-xs font-semibold ${(deal.viabilityScore ?? 0) >= 70
                                                ? "bg-green-500/20 text-green-400"
                                                : (deal.viabilityScore ?? 0) >= 50
                                                    ? "bg-amber-500/20 text-amber-400"
                                                    : "bg-zinc-600/50 text-zinc-400"
                                                }`}
                                        >
                                            {deal.viabilityScore ?? "--"}
                                        </span>
                                        {isHot && (
                                            <span className="px-2 py-1 rounded-md text-xs bg-red-500/20 text-red-400 animate-pulse">
                                                🔥 HOT
                                            </span>
                                        )}
                                    </div>
                                    {deal.industry && (
                                        <span className="px-2 py-1 rounded-md text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                            {deal.industry}
                                        </span>
                                    )}
                                </div>

                                {/* Title */}
                                <h3 className="font-semibold text-white mb-2 line-clamp-2">{deal.name}</h3>

                                {/* Metrics */}
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                    <div>
                                        <p className="text-xs text-[var(--text-dim)]">Revenue</p>
                                        <p className="font-mono text-sm text-[var(--text)]">
                                            {formatCurrency(deal.revenue)}
                                            {deal.revenueType && ` ${deal.revenueType}`}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--text-dim)]">Valuation</p>
                                        <p className="font-mono text-sm text-[var(--text)]">
                                            {deal.valuationMin && deal.valuationMax
                                                ? `${formatCurrency(deal.valuationMin)} - ${formatCurrency(deal.valuationMax)}`
                                                : "N/A"}
                                        </p>
                                    </div>
                                </div>

                                {/* Scores */}
                                <div className="flex gap-4 mb-3 text-xs">
                                    <div className="flex items-center gap-1 text-[var(--text-muted)]">
                                        <TrendingUp className="w-3 h-3" />
                                        <span>Viability: {deal.viabilityScore ?? "--"}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[var(--text-muted)]">
                                        <span>Motivation: {deal.motivationScore ?? "--"}</span>
                                    </div>
                                </div>

                                {/* AI Summary */}
                                {deal.aiSummary && (
                                    <p className="text-sm text-[var(--text-muted)] mb-3 line-clamp-2">
                                        {deal.aiSummary}
                                    </p>
                                )}

                                {/* Risk Flags */}
                                {riskFlags.length > 0 && (
                                    <div className="flex items-center gap-1 text-xs text-amber-400 mb-3">
                                        <AlertTriangle className="w-3 h-3" />
                                        <span>
                                            {riskFlags.length} risk flag{riskFlags.length > 1 ? "s" : ""}
                                        </span>
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                                    {deal.redditAuthor && (
                                        <span className="text-xs text-[var(--text-dim)]">
                                            u/{deal.redditAuthor}
                                        </span>
                                    )}
                                    {deal.redditUrl && (
                                        <a
                                            href={deal.redditUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            View on Reddit
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Deal Modal */}
            <DealModal
                deal={selectedDeal}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
            />
        </div>
    );
}
