"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Loader2, ExternalLink, TrendingUp, AlertTriangle, RotateCcw, Undo2, Redo2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import DealModal from "@/components/DealModal";
import DealCard from "@/components/DealCard";

import { Deal } from "@/types";



export default function DealsPage() {
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [industryFilter, setIndustryFilter] = useState<string>("all");
    const [sourceFilter, setSourceFilter] = useState<string>("all");
    const [minScore, setMinScore] = useState<number>(0);
    const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [undoStack, setUndoStack] = useState<Deal[]>([]);
    const [redoStack, setRedoStack] = useState<Deal[]>([]);
    const [isResetting, setIsResetting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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

    const handleDelete = async (id: string) => {
        const dealToDelete = deals.find(d => d.id === id);
        if (dealToDelete) {
            try {
                // Optimistic update
                setDeals(prev => prev.filter(d => d.id !== id));
                setUndoStack(prev => [...prev, dealToDelete]);
                setRedoStack([]);

                const res = await fetch(`/api/deals?id=${id}`, {
                    method: "DELETE",
                });

                if (!res.ok) {
                    throw new Error("Failed to delete");
                }

                toast.success("Deal deleted");
            } catch (error) {
                toast.error("Failed to delete deal");
                // Revert
                setDeals(prev => [...prev, dealToDelete]);
            }
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
        toast("Are you sure you want to delete ALL deals?", {
            description: "This action cannot be undone.",
            action: {
                label: "Delete All",
                onClick: async () => {
                    setIsResetting(true);
                    try {
                        const res = await fetch("/api/deals?action=reset", {
                            method: "DELETE",
                        });

                        if (res.ok) {
                            setDeals([]);
                            setUndoStack([]);
                            setRedoStack([]);
                            setSelectedIds(new Set());
                            toast.success("All deals cleared");
                        } else {
                            toast.error("Failed to reset");
                        }
                    } catch (error) {
                        toast.error("Failed to reset deals");
                    } finally {
                        setIsResetting(false);
                    }
                },
            },
            cancel: {
                label: "Cancel",
                onClick: () => { },
            },
            duration: 5000,
        });
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;

        toast("Delete selected deals?", {
            description: `This will permanently delete ${selectedIds.size} deals.`,
            action: {
                label: "Delete",
                onClick: async () => {
                    setIsBulkDeleting(true);
                    try {
                        const ids = Array.from(selectedIds);

                        // Optimistic update
                        const previousDeals = [...deals];
                        setDeals(prev => prev.filter(d => !selectedIds.has(d.id)));
                        setSelectedIds(new Set()); // Clear selection immediately

                        const res = await fetch("/api/deals", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ ids }),
                        });

                        if (res.ok) {
                            toast.success(`Deleted ${ids.length} deals`);
                            setUndoStack([]); // Clear undo stack to avoid complexity for now
                            setRedoStack([]);
                        } else {
                            throw new Error("Failed to delete");
                        }
                    } catch (error) {
                        toast.error("Failed to delete deals");
                        // Revert could be implemented here by fetching again or restoring previousDeals
                        fetchDeals(); // Safest fallback
                    } finally {
                        setIsBulkDeleting(false);
                    }
                }
            },
            cancel: { label: "Cancel", onClick: () => { } }
        });
    };

    const industries = [...new Set(deals.map((d) => d.industry).filter(Boolean))];

    const filteredDeals = deals.filter((deal) => {
        if (searchQuery && !deal.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        if (industryFilter !== "all" && deal.industry !== industryFilter) {
            return false;
        }
        if (sourceFilter !== "all" && deal.source !== sourceFilter) {
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
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="fade-in">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                        <span className="gradient-text">Browse Deals</span>
                    </h1>
                    <p className="text-sm text-[var(--text-muted)]">
                        Showing <span className="text-cyan-400 font-semibold">{filteredDeals.length}</span> of <span className="text-white font-semibold">{deals.length}</span> discovered opportunities
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

                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                            className="btn-outline flex items-center gap-2 text-red-400 border-red-500/20 hover:bg-red-500/10 h-[40px] px-3 text-sm animate-in fade-in slide-in-from-top-2"
                        >
                            {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Delete Selected ({selectedIds.size})
                        </button>
                    )}

                    <button
                        onClick={handleTotalReset}
                        disabled={isResetting || deals.length === 0}
                        className="btn-outline flex items-center gap-2 text-red-400 border-red-500/20 hover:bg-red-500/10 h-[40px] px-3 text-sm"
                    >
                        {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        <span className="hidden xs:inline">Reset</span>
                    </button>

                    <Link href="/sources" className="btn-primary flex items-center gap-2 h-[40px] px-4 text-sm">
                        <Search className="w-4 h-4" />
                        New Search
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-strong border border-white/10 rounded-2xl p-5 mb-6 flex flex-wrap gap-4 scale-in">
                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-dim)]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search deals..."
                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-white placeholder:text-[var(--text-dim)] focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Industry filter */}
                <select
                    value={industryFilter}
                    onChange={(e) => setIndustryFilter(e.target.value)}
                    className="bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all cursor-pointer"
                >
                    <option value="all">All Industries</option>
                    {industries.map((ind) => (
                        <option key={ind} value={ind!}>
                            {ind}
                        </option>
                    ))}
                </select>

                {/* Source filter */}
                <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                    className="bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all cursor-pointer"
                >
                    <option value="all">All Sources</option>
                    <option value="reddit">Reddit</option>
                    <option value="ProductHunt">Product Hunt</option>
                    <option value="indiehustle">Indie Hustle</option>
                </select>

                {/* Score filter */}
                <div className="flex items-center gap-3 bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5">
                    <Filter className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-[var(--text-muted)] font-medium">Min Score:</span>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={minScore}
                        onChange={(e) => setMinScore(parseInt(e.target.value))}
                        className="w-24 accent-cyan-500"
                    />
                    <span className="text-sm text-cyan-400 font-mono font-bold w-10 text-right">{minScore}%</span>
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
                    {filteredDeals.map((deal) => (
                        <DealCard
                            key={deal.id}
                            deal={deal}
                            onClick={() => openDeal(deal)}
                            onDelete={handleDelete}
                            selected={selectedIds.has(deal.id)}
                            onSelect={() => toggleSelect(deal.id)}
                            selectionMode={selectedIds.size > 0}
                        />
                    ))}
                </div>
            )}

            {/* Deal Modal */}
            <DealModal
                deal={selectedDeal}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                onDealUpdated={(updatedDeal) => {
                    setDeals(prev => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d));
                    if (selectedDeal?.id === updatedDeal.id) {
                        setSelectedDeal(updatedDeal);
                    }
                }}
            />
        </div>
    );
}
