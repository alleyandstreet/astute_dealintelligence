"use client";

import { Deal } from "@/types";
import { STATUS_OPTIONS } from "@/lib/constants";
import {
    TrendingUp,
    AlertTriangle,
    ExternalLink,
    MoreHorizontal,
    MessageSquare,
    Trash2,
    Copy,
    Check,
    Sparkles,
    DollarSign,
    Target,
    Zap
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface DealCardProps {
    deal: Deal;
    onClick: () => void;
    onDelete: (id: string) => void;
    onStatusChange?: (id: string, status: string) => void;
    selected?: boolean;
    onSelect?: () => void;
    selectionMode?: boolean;
}

function formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return "N/A";
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
}

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

export default function DealCard({ deal, onClick, onDelete, selected = false, onSelect, selectionMode = false }: DealCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const riskFlags: string[] = deal.riskFlags ? JSON.parse(deal.riskFlags) : [];
    const sellerSignals: string[] = deal.sellerSignals ? JSON.parse(deal.sellerSignals) : [];
    const isHot = (deal.motivationScore ?? 0) >= 80;
    const isViable = (deal.viabilityScore ?? 0) >= 70;

    const copyOutreach = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsGenerating(true);
        try {
            // Quick heuristic outreach generation if no API key or just fast
            const message = `Hi ${deal.redditAuthor || 'there'},\n\nI saw your post about ${deal.name.length > 30 ? 'your business' : deal.name} and was impressed by the traction. I work with a search fund looking for ${deal.industry || 'SaaS'} opportunities.\n\nOpen to a brief chat?`;

            await navigator.clipboard.writeText(message);
            toast.success("Outreach copied to clipboard!");
        } catch (err) {
            toast.error("Failed to copy");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(deal.id);
    };

    const handleCardClick = (e: React.MouseEvent) => {
        // If clicking a button or link inside, don't trigger selection/modal
        // (Handled by stopPropagation in those elements, but standard div click needs logic)

        if (selectionMode && onSelect) {
            onSelect();
        } else {
            onClick();
        }
    };

    const handleCheckboxClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onSelect) onSelect();
    };

    return (
        <div
            onClick={handleCardClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`deal-card group relative bg-[var(--card)] border rounded-xl p-0 overflow-hidden cursor-pointer flex flex-col h-full transition-all ${selected
                ? 'border-cyan-500 ring-1 ring-cyan-500/50 bg-cyan-500/5'
                : 'border-[var(--border)]'
                }`}
        >
            {/* Selection Checkbox */}
            {(isHovered || selected || selectionMode) && onSelect && (
                <div
                    className="absolute bottom-3 left-3 z-20"
                    onClick={handleCheckboxClick}
                >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selected
                        ? 'bg-cyan-500 border-cyan-500 text-white'
                        : 'bg-[var(--card)] border-[var(--border)] hover:border-cyan-400'
                        }`}>
                        {selected && <Check className="w-3.5 h-3.5" />}
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="p-5 pb-3">
                <div className="flex justify-between items-start gap-4 mb-2">
                    <div className="flex gap-2 items-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold border transition-colors flex items-center gap-1 ${deal.source === 'ProductHunt'
                            ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                            : deal.source === 'indiehustle'
                                ? 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                                : 'bg-red-500/10 text-red-500 border-red-500/20'
                            }`}>
                            {deal.source === 'ProductHunt' ? <Target className="w-3 h-3" /> : deal.source === 'indiehustle' ? <Zap className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                            {deal.source === 'ProductHunt' ? 'ProductHunt' : deal.source === 'indiehustle' ? 'IndieHustle' : 'Reddit'}
                        </span>

                        {deal.industry && (
                            <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold bg-[var(--background)] border border-[var(--border)] text-[var(--text-muted)] group-hover:border-cyan-500/30 group-hover:text-cyan-400 transition-colors">
                                {deal.industry}
                            </span>
                        )}
                        {/* Pipeline Status Badge */}
                        {(() => {
                            const status = STATUS_OPTIONS.find(s => s.id === deal.status) || STATUS_OPTIONS[0];
                            return (
                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold border transition-colors bg-${status?.color}-500/10 text-${status?.color}-500 border-${status?.color}-500/20`}>
                                    {status?.label}
                                </span>
                            );
                        })()}

                        <span className="text-[10px] text-[var(--text-dim)] flex items-center gap-1">
                            {formatTimeAgo(deal.createdAt.toString())}
                        </span>
                    </div>

                    <div className="flex items-center gap-1">
                        {deal.notes && deal.notes.length > 0 && (
                            <span className="relative flex h-2 w-2 mr-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400/50 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                            </span>
                        )}
                        {isHot && (
                            <span className="flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                        )}
                        <div className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${isViable ? "bg-green-500/10 text-green-400" : "bg-[var(--background)] text-[var(--text-muted)]"
                            }`}>
                            {deal.viabilityScore ?? "-"}%
                        </div>
                    </div>
                </div>

                <h3 className="font-semibold text-base text-[var(--text)] leading-snug line-clamp-2 group-hover:text-cyan-400 transition-colors">
                    {deal.name}
                </h3>
            </div>

            {/* Metrics Dashboard (The "HUD") */}
            <div className="px-5 py-3 bg-[var(--background)]/50 border-y border-[var(--border)] grid grid-cols-2 gap-4">
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] mb-0.5 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> Revenue
                    </p>
                    <p className="font-mono text-sm font-medium text-[var(--text)]">
                        {formatCurrency(deal.revenue)}
                        <span className="text-[10px] text-[var(--text-dim)] ml-1">{deal.revenueType || ''}</span>
                    </p>
                </div>
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] mb-0.5 flex items-center gap-1">
                        <Target className="w-3 h-3" /> Valuation
                    </p>
                    <p className="font-mono text-sm font-medium text-[var(--text)]">
                        {deal.valuationMin ? formatCurrency(deal.valuationMin) : "N/A"}
                    </p>
                </div>
            </div>

            {/* Content Body */}
            <div className="p-5 pt-4 flex-1 flex flex-col gap-4">
                {/* AI Summary */}
                <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-3">
                    {deal.aiSummary || deal.description?.slice(0, 150)}
                </p>

                {/* Signals Grid */}
                <div className="flex flex-wrap gap-1.5 mt-auto">
                    {sellerSignals.slice(0, 2).map((signal, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-green-500/5 text-green-500 border border-green-500/10 flex items-center gap-1">
                            <Sparkles className="w-2 h-2" /> {signal}
                        </span>
                    ))}
                    {riskFlags.slice(0, 2).map((flag, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/5 text-amber-500 border border-amber-500/10 flex items-center gap-1">
                            <AlertTriangle className="w-2 h-2" /> {flag}
                        </span>
                    ))}
                </div>
            </div>

            {/* Footer / Actions */}
            <div className="p-3 pl-10 pr-5 border-t border-[var(--border)] flex items-center justify-between bg-[var(--background)]/30">
                <div className="flex items-center gap-3 text-[10px] text-[var(--text-dim)]">
                    {deal.redditScore !== null && (
                        <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> {deal.redditScore}
                        </span>
                    )}
                    {deal.redditComments !== null && (
                        <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> {deal.redditComments}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                        onClick={copyOutreach}
                        className="p-1.5 rounded hover:bg-[var(--background)] text-[var(--text-muted)] hover:text-cyan-400 transition-colors"
                        title="Copy Outreach"
                    >
                        <Copy className="w-3.5 h-3.5" />
                    </button>
                    {(deal.redditUrl) && (
                        <a
                            href={deal.redditUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded hover:bg-[var(--background)] text-[var(--text-muted)] hover:text-white transition-colors"
                            title="Open Reddit"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    )}
                    <button
                        onClick={handleDelete}
                        className="p-1.5 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                        title="Archive/Delete"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
