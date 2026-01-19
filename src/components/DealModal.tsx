"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    ExternalLink,
    Copy,
    Check,
    TrendingUp,
    Target,
    AlertTriangle,
    MessageSquare,
    DollarSign,
    Building2,
    User,
    Calendar,
    Sparkles,
    StickyNote,
    Send,
    Trash2,
    Loader2,
    RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import TagManager from "./TagManager";

import { Deal } from "@/types";

interface Note {
    id: string;
    content: string;
    createdAt: string;
}

interface DealModalProps {
    deal: Deal | null;
    isOpen: boolean;
    onClose: () => void;
    onStatusChange?: (id: string, status: string) => void;
    onDelete?: (id: string) => void;
}

function formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return "N/A";
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
}

function generateOutreachMessage(deal: Deal): string {
    const username = deal.redditAuthor || "there";
    const businessRef = deal.name.length > 50 ? "your business" : deal.name;
    const industry = deal.industry || "business";
    const revenue = deal.revenue ? formatCurrency(deal.revenue) : "impressive metrics";

    return `Hi ${username},

I came across your post about ${businessRef} and was genuinely impressed by what you've built. The ${revenue} ${deal.revenueType || "revenue"} in the ${industry.toLowerCase()} space speaks to real traction.

I work with a private equity search fund that specializes in acquiring and growing ${industry.toLowerCase()} businesses like yours. We're actively looking for opportunities where we can partner with founders who've done the hard work of building something valuable.

If you're open to it, I'd love to learn more about your journey and explore whether there might be a fit. No pressure at all—happy to sign an NDA and keep everything confidential.

Would a brief 15-minute call work for you sometime this week?

Best regards,
[Your Name]

P.S. Even if now isn't the right time, I'd be glad to stay in touch for whenever you might be ready to explore options.`;
}

const STATUS_OPTIONS = [
    { id: "new_leads", label: "New Lead", color: "cyan" },
    { id: "qualified", label: "Qualified", color: "blue" },
    { id: "contacted", label: "Contacted", color: "amber" },
    { id: "in_discussion", label: "In Discussion", color: "purple" },
    { id: "due_diligence", label: "Due Diligence", color: "green" },
];

export default function DealModal({ deal, isOpen, onClose, onStatusChange, onDelete }: DealModalProps) {
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<"overview" | "outreach" | "notes">("overview");
    const [notes, setNotes] = useState<Note[]>([]);
    const [newNote, setNewNote] = useState("");
    const [isLoadingNotes, setIsLoadingNotes] = useState(false);
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [isDeletingDeal, setIsDeletingDeal] = useState(false);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [dealTags, setDealTags] = useState<any[]>([]);
    const [aiOutreachMessage, setAiOutreachMessage] = useState<string>("");
    const [isGeneratingOutreach, setIsGeneratingOutreach] = useState(false);

    useEffect(() => {
        if (deal && isOpen) {
            fetchNotes();
            fetchDealTags();
        }
    }, [deal?.id, isOpen]);

    const fetchDealTags = async () => {
        if (!deal) return;
        try {
            const res = await fetch(`/api/deals/${deal.id}`);
            if (res.ok) {
                const data = await res.json();
                setDealTags(data.tags || []);
            }
        } catch (error) {
            console.error("Failed to fetch deal tags:", error);
        }
    };

    const fetchNotes = async () => {
        if (!deal) return;
        setIsLoadingNotes(true);
        try {
            const res = await fetch(`/api/notes?dealId=${deal.id}`);
            if (res.ok) {
                const data = await res.json();
                setNotes(data);
            }
        } catch (error) {
            console.error("Failed to fetch notes:", error);
        } finally {
            setIsLoadingNotes(false);
        }
    };

    const addNote = async () => {
        if (!deal || !newNote.trim()) return;
        setIsSavingNote(true);
        try {
            const res = await fetch("/api/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dealId: deal.id, content: newNote }),
            });
            if (res.ok) {
                const note = await res.json();
                setNotes([note, ...notes]);
                setNewNote("");
                toast.success("Note added!");
            }
        } catch (error) {
            toast.error("Failed to add note");
        } finally {
            setIsSavingNote(false);
        }
    };

    const deleteNote = async (noteId: string) => {
        try {
            await fetch(`/api/notes?id=${noteId}`, { method: "DELETE" });
            setNotes(notes.filter((n) => n.id !== noteId));
            toast.success("Note deleted");
        } catch (error) {
            toast.error("Failed to delete note");
        }
    };

    const fetchAiOutreach = async () => {
        if (!deal) return;
        setIsGeneratingOutreach(true);
        try {
            const res = await fetch("/api/ai/outreach", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dealName: deal.name,
                    industry: deal.industry,
                    revenue: formatCurrency(deal.revenue),
                    username: deal.redditAuthor,
                    aiSummary: deal.aiSummary
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setAiOutreachMessage(data.message);
            }
        } catch (error) {
            console.error("Failed to generate AI outreach:", error);
        } finally {
            setIsGeneratingOutreach(false);
        }
    };

    useEffect(() => {
        if (isOpen && deal && activeTab === "outreach" && !aiOutreachMessage) {
            fetchAiOutreach();
        }
    }, [isOpen, activeTab, deal?.id]);

    if (!deal) return null;

    const riskFlags: string[] = deal.riskFlags ? JSON.parse(deal.riskFlags) : [];
    const sellerSignals: string[] = deal.sellerSignals ? JSON.parse(deal.sellerSignals) : [];
    const defaultOutreach = generateOutreachMessage(deal);
    const displayedMessage = aiOutreachMessage || defaultOutreach;

    const copyMessage = async () => {
        await navigator.clipboard.writeText(displayedMessage);
        setCopied(true);
        toast.success("Message copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleStatusChange = async (status: string) => {
        if (onStatusChange) {
            onStatusChange(deal.id, status);
        }
        try {
            await fetch("/api/deals", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: deal.id, status }),
            });
            toast.success("Status updated!");
        } catch {
            toast.error("Failed to update status");
        }
    };

    const handleDeleteDeal = async () => {
        if (!deal) return;

        if (!isConfirmingDelete) {
            setIsConfirmingDelete(true);
            return;
        }

        setIsDeletingDeal(true);

        try {
            const res = await fetch(`/api/deals?id=${deal.id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                toast.success("Deal deleted successfully");
                onClose();
                if (onDelete) {
                    onDelete(deal.id);
                }
            } else {
                const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
                throw new Error(errorData.error || "Failed to delete");
            }
        } catch (error: any) {
            console.error("Delete error:", error);
            toast.error(error.message || "Failed to delete deal");
            setIsConfirmingDelete(false);
        } finally {
            setIsDeletingDeal(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-4 md:inset-10 lg:inset-20 bg-[var(--card)] border border-[var(--border)] rounded-2xl z-50 overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row items-start justify-between p-4 sm:p-6 border-b border-[var(--border)] gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <span
                                        className={`px-2 py-0.5 rounded text-xs font-semibold ${(deal.viabilityScore ?? 0) >= 70
                                            ? "bg-green-500/20 text-green-400"
                                            : (deal.viabilityScore ?? 0) >= 50
                                                ? "bg-amber-500/20 text-amber-400"
                                                : "bg-zinc-600/50 text-zinc-400"
                                            }`}
                                    >
                                        {deal.viabilityScore ?? "--"}% Viability
                                    </span>
                                    {(deal.motivationScore ?? 0) >= 80 && (
                                        <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
                                            🔥 Hot Deal
                                        </span>
                                    )}
                                    {deal.industry && (
                                        <span className="px-2 py-0.5 rounded text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                            {deal.industry}
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-white truncate max-w-full">{deal.name}</h2>
                                <p className="text-xs text-[var(--text-muted)] mt-1">Source: <span className="text-cyan-400">{deal.sourceName}</span></p>
                            </div>
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 sm:static p-2 rounded-lg hover:bg-[var(--background)] text-[var(--text-muted)] hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex overflow-x-auto no-scrollbar gap-1 px-4 sm:px-6 pt-4 border-b border-[var(--border)] scroll-smooth bg-[#121214]/50">
                            {[
                                { id: "overview", label: "Overview", icon: null },
                                { id: "notes", label: `Notes ${notes.length > 0 ? `(${notes.length})` : ""}`, icon: StickyNote },
                                { id: "outreach", label: "Contact", icon: MessageSquare },
                            ].map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`flex-none px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id
                                            ? "bg-[var(--background)] text-white border-t border-x border-[var(--border)]"
                                            : "text-[var(--text-muted)] hover:text-white"
                                            }`}
                                    >
                                        {Icon && <Icon className="w-4 h-4" />}
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {activeTab === "overview" ? (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Main Content */}
                                    <div className="lg:col-span-2 space-y-6">
                                        {/* AI Summary */}
                                        {deal.aiSummary && (
                                            <div className="bg-gradient-to-br from-cyan-500/5 to-purple-500/5 border border-cyan-500/20 rounded-xl p-5">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Sparkles className="w-4 h-4 text-cyan-400" />
                                                    <h3 className="font-semibold text-white">Analysis Summary</h3>
                                                </div>
                                                <p className="text-[var(--text-muted)] leading-relaxed">{deal.aiSummary}</p>
                                            </div>
                                        )}

                                        {/* Description */}
                                        {deal.description && (
                                            <div>
                                                <h3 className="font-semibold text-white mb-3">Original Post</h3>
                                                <div className="bg-[var(--background)] rounded-xl p-5 max-h-64 overflow-y-auto">
                                                    <p className="text-[var(--text-muted)] whitespace-pre-wrap text-sm leading-relaxed">
                                                        {deal.description}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Risk Flags */}
                                        {riskFlags.length > 0 && (
                                            <div>
                                                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                                                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                                                    Risk Flags
                                                </h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {riskFlags.map((flag, i) => (
                                                        <span
                                                            key={i}
                                                            className="px-3 py-1.5 rounded-lg text-sm bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                        >
                                                            {flag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Seller Signals */}
                                        {sellerSignals.length > 0 && (
                                            <div>
                                                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                                                    <Target className="w-4 h-4 text-green-400" />
                                                    Seller Signals
                                                </h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {sellerSignals.map((signal, i) => (
                                                        <span
                                                            key={i}
                                                            className="px-3 py-1.5 rounded-lg text-sm bg-green-500/10 text-green-400 border border-green-500/20"
                                                        >
                                                            {signal}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Tags */}
                                        <div>
                                            <h3 className="font-semibold text-white mb-3">Tags</h3>
                                            <TagManager
                                                dealId={deal.id}
                                                dealTags={dealTags}
                                                onTagsChange={setDealTags}
                                            />
                                        </div>
                                    </div>

                                    {/* Sidebar */}
                                    <div className="space-y-6">
                                        {/* Metrics Card */}
                                        <div className="bg-[var(--background)] rounded-xl p-5 space-y-4">
                                            <h3 className="font-semibold text-white">Metrics</h3>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[var(--text-muted)] flex items-center gap-2">
                                                        <TrendingUp className="w-4 h-4" />
                                                        Viability
                                                    </span>
                                                    <span className="font-mono text-white">{deal.viabilityScore ?? "--"}%</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[var(--text-muted)] flex items-center gap-2">
                                                        <Target className="w-4 h-4" />
                                                        Motivation
                                                    </span>
                                                    <span className="font-mono text-white">{deal.motivationScore ?? "--"}%</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[var(--text-muted)] flex items-center gap-2">
                                                        <DollarSign className="w-4 h-4" />
                                                        Revenue
                                                    </span>
                                                    <span className="font-mono text-white">
                                                        {formatCurrency(deal.revenue)} {deal.revenueType || ""}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[var(--text-muted)] flex items-center gap-2">
                                                        <Building2 className="w-4 h-4" />
                                                        Valuation
                                                    </span>
                                                    <span className="font-mono text-white">
                                                        {deal.valuationMin && deal.valuationMax
                                                            ? `${formatCurrency(deal.valuationMin)} - ${formatCurrency(deal.valuationMax)}`
                                                            : "N/A"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contact Info */}
                                        <div className="bg-[var(--background)] rounded-xl p-5 space-y-4">
                                            <h3 className="font-semibold text-white">Contact</h3>
                                            <div className="space-y-2">
                                                {deal.redditAuthor && (
                                                    <div className="flex items-center gap-2">
                                                        <a
                                                            href={`https://reddit.com/u/${deal.redditAuthor}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
                                                        >
                                                            <User className="w-4 h-4" />
                                                            u/{deal.redditAuthor}
                                                        </a>
                                                        <span className="text-xs text-[var(--text-dim)]">in {deal.sourceName}</span>
                                                    </div>
                                                )}
                                                {deal.redditUrl && (
                                                    <a
                                                        href={deal.redditUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                        View Original Post
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status Selector */}
                                        <div className="bg-[var(--background)] rounded-xl p-5 space-y-4">
                                            <h3 className="font-semibold text-white">Pipeline Status</h3>
                                            <div className="space-y-2">
                                                {STATUS_OPTIONS.map((option) => (
                                                    <button
                                                        key={option.id}
                                                        onClick={() => handleStatusChange(option.id)}
                                                        className={`w-full px-3 py-2 rounded-lg text-sm text-left transition-all ${deal.status === option.id
                                                            ? `bg-${option.color}-500/20 text-${option.color}-400 border border-${option.color}-500/30`
                                                            : "bg-[var(--card)] text-[var(--text-muted)] hover:bg-[var(--card-hover)] hover:text-white"
                                                            }`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="bg-[var(--background)] rounded-xl p-5 space-y-4">
                                            <h3 className="font-semibold text-white">Danger Zone</h3>
                                            <button
                                                onClick={handleDeleteDeal}
                                                disabled={isDeletingDeal}
                                                className={`w-full px-3 py-2 rounded-lg text-sm text-left transition-all flex items-center justify-between group ${isConfirmingDelete
                                                    ? "bg-red-500 text-white font-bold"
                                                    : "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {isDeletingDeal ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                    {isConfirmingDelete ? "Click again to confirm" : "Delete Listing"}
                                                </div>
                                                {isConfirmingDelete && (
                                                    <span className="text-[10px] uppercase tracking-wider opacity-80">Permanent</span>
                                                )}
                                            </button>
                                            {isConfirmingDelete && (
                                                <button
                                                    onClick={() => setIsConfirmingDelete(false)}
                                                    className="w-full text-center text-xs text-[var(--text-dim)] hover:text-white transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>

                                        {/* Date */}
                                        <div className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
                                            <Calendar className="w-4 h-4" />
                                            Added {new Date(deal.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            ) : activeTab === "notes" ? (
                                /* Notes Tab */
                                <div className="max-w-2xl mx-auto">
                                    {/* Add Note */}
                                    <div className="mb-6">
                                        <div className="flex gap-3">
                                            <textarea
                                                value={newNote}
                                                onChange={(e) => setNewNote(e.target.value)}
                                                placeholder="Add a note about this deal..."
                                                className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-white placeholder:text-[var(--text-dim)] focus:border-cyan-500 focus:outline-none resize-none"
                                                rows={3}
                                            />
                                        </div>
                                        <div className="flex justify-end mt-3">
                                            <button
                                                onClick={addNote}
                                                disabled={isSavingNote || !newNote.trim()}
                                                className="btn-primary flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {isSavingNote ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Send className="w-4 h-4" />
                                                )}
                                                Add Note
                                            </button>
                                        </div>
                                    </div>

                                    {/* Notes List */}
                                    {isLoadingNotes ? (
                                        <div className="flex justify-center py-12">
                                            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                                        </div>
                                    ) : notes.length === 0 ? (
                                        <div className="text-center py-12">
                                            <StickyNote className="w-12 h-12 text-[var(--text-dim)] mx-auto mb-4" />
                                            <p className="text-[var(--text-muted)]">No notes yet</p>
                                            <p className="text-sm text-[var(--text-dim)]">Add your first note above</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {notes.map((note) => (
                                                <motion.div
                                                    key={note.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="bg-[var(--background)] rounded-xl p-4 group"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <p className="text-[var(--text)] whitespace-pre-wrap">{note.content}</p>
                                                        <button
                                                            onClick={() => deleteNote(note.id)}
                                                            className="p-1 rounded text-[var(--text-dim)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-[var(--text-dim)] mt-2">
                                                        {new Date(note.createdAt).toLocaleString()}
                                                    </p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Outreach Tab */
                                <div className="max-w-3xl mx-auto">
                                    <div className="bg-gradient-to-br from-cyan-500/5 to-purple-500/5 border border-cyan-500/20 rounded-xl p-6 mb-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="w-5 h-5 text-cyan-400" />
                                                <h3 className="font-semibold text-white">AI outreach Message</h3>
                                            </div>
                                            <button
                                                onClick={fetchAiOutreach}
                                                disabled={isGeneratingOutreach}
                                                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 disabled:opacity-50"
                                            >
                                                {isGeneratingOutreach ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                                Regenerate
                                            </button>
                                        </div>
                                        <p className="text-[var(--text-muted)] text-sm mb-0">
                                            Crafted by Gemini AI based on context. Copy and send via Reddit DM.
                                        </p>
                                    </div>

                                    <div className="relative">
                                        {isGeneratingOutreach && (
                                            <div className="absolute inset-0 bg-[var(--background)]/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                                                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                                            </div>
                                        )}
                                        <div className="bg-[var(--background)] rounded-xl p-6 font-mono text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap min-h-[200px]">
                                            {displayedMessage}
                                        </div>
                                        <button
                                            onClick={copyMessage}
                                            className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors"
                                        >
                                            {copied ? (
                                                <>
                                                    <Check className="w-4 h-4" />
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-4 h-4" />
                                                    Copy Message
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <div className="mt-6 flex gap-4">
                                        {deal.redditAuthor && (
                                            <a
                                                href={`https://www.reddit.com/message/compose/?to=${deal.redditAuthor}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn-primary flex items-center gap-2"
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                                Open Reddit DM
                                            </a>
                                        )}
                                        <button
                                            onClick={() => {
                                                handleStatusChange("contacted");
                                                toast.success("Marked as Contacted");
                                            }}
                                            className="btn-secondary flex items-center gap-2"
                                        >
                                            <Check className="w-4 h-4" />
                                            Mark as Contacted
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
