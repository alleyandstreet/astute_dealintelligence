"use client";

import { useState, useEffect } from "react";
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Loader2, ExternalLink, TrendingUp, Undo2, Redo2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DealModal from "@/components/DealModal";

import { Deal } from "@/types";

const COLUMNS = [
    { id: "new_leads", title: "New Leads", color: "cyan" },
    { id: "qualified", title: "Qualified", color: "blue" },
    { id: "contacted", title: "Contacted", color: "amber" },
    { id: "in_discussion", title: "In Discussion", color: "purple" },
    { id: "due_diligence", title: "Due Diligence", color: "green" },
];

function formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return "N/A";
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
}

function DealCard({ deal, isDragging, onClick }: { deal: Deal; isDragging?: boolean; onClick?: () => void }) {
    const isHot = (deal.motivationScore ?? 0) >= 80;

    return (
        <div
            onClick={onClick}
            className={`bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all ${isDragging ? "opacity-50 shadow-xl scale-105" : "hover:border-[var(--border-light)]"
                }`}
        >
            <div className="flex items-center gap-2 mb-2">
                <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${(deal.viabilityScore ?? 0) >= 70
                        ? "bg-green-500/20 text-green-400"
                        : (deal.viabilityScore ?? 0) >= 50
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-zinc-600/50 text-zinc-400"
                        }`}
                >
                    {deal.viabilityScore ?? "--"}
                </span>
                {(deal.motivationScore ?? 0) >= 80 && (
                    <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
                        🔥 HOT
                    </span>
                )}
                {deal.notes && deal.notes.length > 0 && (
                    <span className="relative flex h-2 w-2 ml-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400/50 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                    </span>
                )}
            </div>
            <h4 className="font-medium text-white text-sm mb-1 line-clamp-2">{deal.name}</h4>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]">
                <span className="text-cyan-400/80">{deal.sourceName}</span>
                {deal.industry && (
                    <>
                        <span>•</span>
                        <span>{deal.industry}</span>
                    </>
                )}
                {deal.revenue && (
                    <>
                        <span>•</span>
                        <span className="font-mono">{formatCurrency(deal.revenue)}</span>
                    </>
                )}
            </div>
            {deal.redditUrl && (
                <a
                    href={deal.redditUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                >
                    <ExternalLink className="w-3 h-3" />
                    Reddit
                </a>
            )}
        </div>
    );
}

function SortableDealCard({ deal, onCardClick }: { deal: Deal; onCardClick: (deal: Deal) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: deal.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <DealCard deal={deal} isDragging={isDragging} onClick={() => onCardClick(deal)} />
        </div>
    );
}

function Column({ column, deals, onCardClick }: { column: typeof COLUMNS[0]; deals: Deal[]; onCardClick: (deal: Deal) => void }) {
    return (
        <div className="flex-1 min-w-[280px] bg-[var(--background)] border border-[var(--border)] rounded-xl overflow-hidden">
            <div className={`px-4 py-3 border-b border-[var(--border)] bg-${column.color}-500/5`}>
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">{column.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs bg-${column.color}-500/20 text-${column.color}-400`}>
                        {deals.length}
                    </span>
                </div>
            </div>
            <div className="p-3 space-y-3 min-h-[500px] max-h-[calc(100vh-250px)] overflow-y-auto">
                <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                    {deals.map((deal) => (
                        <SortableDealCard key={deal.id} deal={deal} onCardClick={onCardClick} />
                    ))}
                </SortableContext>
                {deals.length === 0 && (
                    <div className="text-center py-8 text-[var(--text-dim)] text-sm">
                        No deals
                    </div>
                )}
            </div>
        </div>
    );
}

export default function PipelinePage() {
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [undoStack, setUndoStack] = useState<Deal[]>([]);
    const [redoStack, setRedoStack] = useState<Deal[]>([]);
    const [isResetting, setIsResetting] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

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
            setRedoStack([]);
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
                setDeals(prev => [...prev, newDeal]);
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

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const dealId = active.id as string;
        const overId = over.id as string;

        // Find which column the deal was dropped into
        let newStatus: string | null = null;

        // Check if dropped on a column header
        for (const col of COLUMNS) {
            if (overId === col.id) {
                newStatus = col.id;
                break;
            }
        }

        // Check if dropped on another deal
        if (!newStatus) {
            const overDeal = deals.find((d) => d.id === overId);
            if (overDeal) {
                newStatus = overDeal.status;
            }
        }

        if (!newStatus) return;

        // Update locally
        setDeals((prev) =>
            prev.map((d) => (d.id === dealId ? { ...d, status: newStatus! } : d))
        );

        // Update on server
        try {
            await fetch("/api/deals", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: dealId, status: newStatus }),
            });
            toast.success("Deal moved!");
        } catch (error) {
            toast.error("Failed to update deal");
            fetchDeals(); // Refresh on error
        }
    };

    const activeDeal = deals.find((d) => d.id === activeId);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Pipeline</h1>
                    <p className="text-sm text-[var(--text-muted)]">
                        Drag and drop deals to manage stage progression
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
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
                        className="btn-outline flex items-center gap-2 text-red-400 border-red-500/20 hover:bg-red-500/10 h-[40px] px-3 text-sm"
                    >
                        {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        <span className="hidden xs:inline">Reset</span>
                    </button>

                    <div className="flex items-center gap-2 text-[var(--text-muted)] bg-[var(--card)] border border-[var(--border)] px-3 py-2 rounded-lg text-sm">
                        <TrendingUp className="w-4 h-4" />
                        <span className="whitespace-nowrap">{deals.length} deals</span>
                    </div>
                </div>
            </div>

            {/* Kanban Board */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {COLUMNS.map((column) => (
                        <Column
                            key={column.id}
                            column={column}
                            deals={deals.filter((d) => d.status === column.id)}
                            onCardClick={openDeal}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeDeal && <DealCard deal={activeDeal} isDragging />}
                </DragOverlay>
            </DndContext>

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
