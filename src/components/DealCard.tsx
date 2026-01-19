"use client";

import { ExternalLink, MessageCircle, TrendingUp, AlertTriangle } from "lucide-react";

interface DealCardProps {
    id: string;
    name: string;
    industry?: string;
    revenue?: string;
    valuationMin?: number;
    valuationMax?: number;
    viabilityScore?: number;
    motivationScore?: number;
    aiSummary?: string;
    redditAuthor?: string;
    redditUrl?: string;
    riskFlags?: string[];
    status: string;
    onClick?: () => void;
}

function formatCurrency(value: number): string {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
}

function getScoreBadge(score: number | undefined) {
    if (!score) return { color: "bg-zinc-600", emoji: "⚪", label: "N/A" };
    if (score >= 85) return { color: "score-high", emoji: "🟢", label: "Hot" };
    if (score >= 70) return { color: "score-medium", emoji: "🟡", label: "Warm" };
    if (score >= 50) return { color: "bg-orange-500/20 text-orange-400", emoji: "🟠", label: "Cool" };
    return { color: "bg-zinc-600", emoji: "⚪", label: "Low" };
}

export default function DealCard({
    id,
    name,
    industry,
    revenue,
    valuationMin,
    valuationMax,
    viabilityScore,
    motivationScore,
    aiSummary,
    redditAuthor,
    redditUrl,
    riskFlags,
    status,
    onClick,
}: DealCardProps) {
    const scoreBadge = getScoreBadge(viabilityScore);
    const hasHighMotivation = (motivationScore ?? 0) >= 80;

    return (
        <div
            onClick={onClick}
            className="deal-card bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 cursor-pointer"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span
                        className={`px-2 py-1 rounded-md text-xs font-semibold ${scoreBadge.color}`}
                    >
                        {scoreBadge.emoji} {viabilityScore ?? "--"}
                    </span>
                    {hasHighMotivation && (
                        <span className="px-2 py-1 rounded-md text-xs font-semibold bg-red-500/20 text-red-400 animate-pulse">
                            🔥 HOT
                        </span>
                    )}
                </div>
                {industry && (
                    <span className="px-2 py-1 rounded-md text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {industry}
                    </span>
                )}
            </div>

            {/* Title */}
            <h3 className="font-semibold text-white mb-2 line-clamp-2">{name}</h3>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                    <p className="text-xs text-[var(--text-dim)]">Revenue</p>
                    <p className="font-mono text-sm text-[var(--text)]">{revenue || "N/A"}</p>
                </div>
                <div>
                    <p className="text-xs text-[var(--text-dim)]">Valuation</p>
                    <p className="font-mono text-sm text-[var(--text)]">
                        {valuationMin && valuationMax
                            ? `${formatCurrency(valuationMin)} - ${formatCurrency(valuationMax)}`
                            : "N/A"}
                    </p>
                </div>
            </div>

            {/* Scores Row */}
            <div className="flex gap-4 mb-3 text-xs">
                <div className="flex items-center gap-1 text-[var(--text-muted)]">
                    <TrendingUp className="w-3 h-3" />
                    <span>Viability: {viabilityScore ?? "--"}</span>
                </div>
                <div className="flex items-center gap-1 text-[var(--text-muted)]">
                    <MessageCircle className="w-3 h-3" />
                    <span>Motivation: {motivationScore ?? "--"}</span>
                </div>
            </div>

            {/* AI Summary */}
            {aiSummary && (
                <p className="text-sm text-[var(--text-muted)] mb-3 line-clamp-2">{aiSummary}</p>
            )}

            {/* Risk Flags */}
            {riskFlags && riskFlags.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-amber-400 mb-3">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{riskFlags.length} risk flag{riskFlags.length > 1 ? "s" : ""}</span>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                {redditAuthor && (
                    <span className="text-xs text-[var(--text-dim)]">u/{redditAuthor}</span>
                )}
                {redditUrl && (
                    <a
                        href={redditUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                    >
                        <ExternalLink className="w-3 h-3" />
                        Reddit
                    </a>
                )}
            </div>
        </div>
    );
}
