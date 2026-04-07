"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    Filter,
    Flame,
    Loader2,
    PlusCircle,
    RefreshCw,
    Save,
    Search,
    Target,
    TimerReset,
    Users,
    Zap,
} from "lucide-react";

type DealQueueItem = {
    id: string;
    name: string;
    status: string;
    priority: string;
    ownerId: string | null;
    owner?: { id: string; username: string; email?: string | null } | null;
    nextAction: string | null;
    nextActionAt: string | null;
    updatedAt: string;
    sourceName?: string | null;
};

type CriticalDeal = {
    id: string;
    name: string;
    status: string;
    priority: string;
    ownerId: string | null;
    owner?: { id: string; username: string; email?: string | null } | null;
    nextAction: string | null;
    nextActionAt: string | null;
    updatedAt: string;
    sourceName?: string | null;
    riskScore: number;
    signals: string[];
};

type TeamOwnership = {
    id: string;
    username: string;
    email?: string | null;
    role: string;
    ownedDeals: number;
    highPriorityDeals: number;
    openTasks: number;
    completedTasks: number;
    activityCount14d: number;
    scanCount14d: number;
    dealUpdates14d: number;
};

type CrmTask = {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: string | null;
    assignedToId?: string | null;
    assignedTo?: { id: string; username: string; email?: string | null } | null;
    deal?: { id: string; name: string; status: string; priority?: string | null } | null;
};

type OverviewResponse = {
    generatedAt: string;
    currentUserId: string | null;
    pipeline: {
        totalDeals: number;
        unassignedDeals: number;
        highPriorityDeals: number;
        staleDeals: number;
        ownerCoveragePct: number;
        nextActionCoveragePct: number;
        overdueNextActions: number;
        dueTodayNextActions: number;
    };
    tasks: {
        total: number;
        overdue: number;
        dueToday: number;
        dueNext24h: number;
        blocked: number;
        unassigned: number;
        buckets: Record<string, number>;
    };
    ownership: TeamOwnership[];
    staleDeals: DealQueueItem[];
    overdueTasks: CrmTask[];
    recentTasks: CrmTask[];
    unassignedDealList: DealQueueItem[];
    criticalDeals: CriticalDeal[];
};

type DealEditState = {
    ownerId: string;
    priority: string;
    nextAction: string;
    nextActionAt: string;
};

type TaskFormState = {
    title: string;
    priority: string;
    assignedToId: string;
    dealId: string;
    dueDate: string;
};

function formatDateTimeInput(value?: string | null): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function signalLabel(signal: string): string {
    if (signal === "owner_missing") return "No owner";
    if (signal === "next_action_missing") return "No next action";
    if (signal === "next_action_overdue") return "Overdue next action";
    if (signal === "high_priority") return "High priority";
    if (signal === "stale_update") return "Stale update";
    return signal;
}

function getDueMeta(dueDate?: string | null, status?: string) {
    if (status === "done") {
        return { label: "Completed", badgeClass: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25", rank: 5, isUrgent: false };
    }
    if (!dueDate) {
        return { label: "No due date", badgeClass: "bg-zinc-500/10 text-zinc-300 border border-zinc-500/25", rank: 4, isUrgent: false };
    }

    const now = new Date();
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) {
        return { label: "Invalid due date", badgeClass: "bg-rose-500/10 text-rose-300 border border-rose-500/25", rank: 0, isUrgent: true };
    }

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    if (due < now) {
        return { label: "Overdue", badgeClass: "bg-rose-500/10 text-rose-300 border border-rose-500/30", rank: 0, isUrgent: true };
    }
    if (due >= todayStart && due <= todayEnd) {
        return { label: "Due today", badgeClass: "bg-amber-500/10 text-amber-300 border border-amber-500/30", rank: 1, isUrgent: true };
    }
    if (due <= next24h) {
        return { label: "Due <24h", badgeClass: "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30", rank: 2, isUrgent: true };
    }

    return { label: "Upcoming", badgeClass: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30", rank: 3, isUrgent: false };
}

function formatDateTime(value?: string | null): string {
    if (!value) return "Not set";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Invalid date";
    return date.toLocaleString();
}

export default function CrmPage() {
    const [overview, setOverview] = useState<OverviewResponse | null>(null);
    const [tasks, setTasks] = useState<CrmTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [savingDealId, setSavingDealId] = useState<string | null>(null);
    const [dealEdits, setDealEdits] = useState<Record<string, DealEditState>>({});
    const [creatingTask, setCreatingTask] = useState(false);
    const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
    const [taskSearch, setTaskSearch] = useState("");
    const [taskStatusFilter, setTaskStatusFilter] = useState("all");
    const [taskPriorityFilter, setTaskPriorityFilter] = useState("all");
    const [taskAssigneeFilter, setTaskAssigneeFilter] = useState("all");
    const [onlyMine, setOnlyMine] = useState(false);
    const [onlyUrgent, setOnlyUrgent] = useState(false);
    const [taskForm, setTaskForm] = useState<TaskFormState>({
        title: "",
        priority: "medium",
        assignedToId: "",
        dealId: "",
        dueDate: "",
    });

    const queue = useMemo(() => {
        if (!overview) return [];
        const seen = new Set<string>();
        const combined = [...overview.unassignedDealList, ...overview.staleDeals];
        const unique: DealQueueItem[] = [];
        for (const deal of combined) {
            if (seen.has(deal.id)) continue;
            seen.add(deal.id);
            unique.push(deal);
        }
        return unique.slice(0, 60);
    }, [overview]);

    const teamMembers = useMemo(() => (overview ? overview.ownership : []), [overview]);
    const criticalDeals = useMemo(() => (overview ? overview.criticalDeals : []), [overview]);
    const criticalDealMap = useMemo(() => new Map(criticalDeals.map((deal) => [deal.id, deal])), [criticalDeals]);
    const currentUserId = overview?.currentUserId || null;

    const recommendedOwnerId = useMemo(() => {
        if (teamMembers.length === 0) return "";
        const sorted = [...teamMembers].sort((a, b) => {
            const aLoad = a.openTasks + a.highPriorityDeals * 2;
            const bLoad = b.openTasks + b.highPriorityDeals * 2;
            return aLoad - bLoad;
        });
        return sorted[0]?.id || "";
    }, [teamMembers]);

    const recommendedOwner = useMemo(
        () => teamMembers.find((member) => member.id === recommendedOwnerId) || null,
        [teamMembers, recommendedOwnerId],
    );

    const filteredTasks = useMemo(() => {
        const query = taskSearch.trim().toLowerCase();
        const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
        return tasks
            .filter((task) => {
                if (taskStatusFilter !== "all" && task.status !== taskStatusFilter) return false;
                if (taskPriorityFilter !== "all" && task.priority !== taskPriorityFilter) return false;
                if (taskAssigneeFilter === "unassigned" && task.assignedToId) return false;
                if (taskAssigneeFilter !== "all" && taskAssigneeFilter !== "unassigned" && task.assignedToId !== taskAssigneeFilter) return false;
                if (onlyMine && currentUserId && task.assignedToId !== currentUserId) return false;
                if (query) {
                    const haystack = `${task.title} ${task.deal?.name || ""} ${task.assignedTo?.username || ""}`.toLowerCase();
                    if (!haystack.includes(query)) return false;
                }
                if (onlyUrgent) {
                    const due = getDueMeta(task.dueDate, task.status);
                    const urgentByPriority = task.priority === "high" && task.status !== "done";
                    const urgentByBlock = task.status === "blocked";
                    if (!due.isUrgent && !urgentByPriority && !urgentByBlock) return false;
                }
                return true;
            })
            .sort((a, b) => {
                if (a.status === "done" && b.status !== "done") return 1;
                if (b.status === "done" && a.status !== "done") return -1;

                const dueA = getDueMeta(a.dueDate, a.status);
                const dueB = getDueMeta(b.dueDate, b.status);
                if (dueA.rank !== dueB.rank) return dueA.rank - dueB.rank;

                const priorityDelta = (priorityRank[a.priority] ?? 5) - (priorityRank[b.priority] ?? 5);
                if (priorityDelta !== 0) return priorityDelta;

                const dueTimeA = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
                const dueTimeB = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
                return dueTimeA - dueTimeB;
            });
    }, [
        tasks,
        taskSearch,
        taskStatusFilter,
        taskPriorityFilter,
        taskAssigneeFilter,
        onlyMine,
        onlyUrgent,
        currentUserId,
    ]);

    const visibleUrgentTaskCount = useMemo(
        () =>
            filteredTasks.filter((task) => {
                const due = getDueMeta(task.dueDate, task.status);
                return due.isUrgent || (task.priority === "high" && task.status !== "done") || task.status === "blocked";
            }).length,
        [filteredTasks],
    );

    const loadData = async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            const [overviewRes, tasksRes] = await Promise.all([
                fetch("/api/crm/overview"),
                fetch("/api/crm/tasks"),
            ]);

            if (!overviewRes.ok) throw new Error("Failed to load CRM overview");
            if (!tasksRes.ok) throw new Error("Failed to load CRM tasks");

            const overviewData = (await overviewRes.json()) as OverviewResponse;
            const tasksData = (await tasksRes.json()) as CrmTask[];

            setOverview(overviewData);
            setTasks(tasksData);

            const nextEdits: Record<string, DealEditState> = {};
            const combined = [...overviewData.unassignedDealList, ...overviewData.staleDeals];
            for (const deal of combined) {
                nextEdits[deal.id] = {
                    ownerId: deal.ownerId || "",
                    priority: deal.priority || "medium",
                    nextAction: deal.nextAction || "",
                    nextActionAt: formatDateTimeInput(deal.nextActionAt),
                };
            }
            setDealEdits(nextEdits);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load CRM workspace");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const updateDealEdit = (dealId: string, patch: Partial<DealEditState>) => {
        setDealEdits((prev) => ({
            ...prev,
            [dealId]: { ...prev[dealId], ...patch },
        }));
    };

    const saveDeal = async (dealId: string) => {
        const edit = dealEdits[dealId];
        if (!edit) return;

        setSavingDealId(dealId);
        try {
            const response = await fetch("/api/deals", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: dealId,
                    ownerId: edit.ownerId || null,
                    priority: edit.priority || "medium",
                    nextAction: edit.nextAction || null,
                    nextActionAt: edit.nextActionAt ? new Date(edit.nextActionAt).toISOString() : null,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to save deal assignment");
            }

            toast.success("Deal updated");
            await loadData(true);
        } catch (error) {
            console.error(error);
            toast.error("Could not update deal");
        } finally {
            setSavingDealId(null);
        }
    };

    const patchTask = async (taskId: string, patch: Record<string, unknown>, successMessage?: string) => {
        setUpdatingTaskId(taskId);
        try {
            const response = await fetch("/api/crm/tasks", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: taskId, ...patch }),
            });

            if (!response.ok) {
                throw new Error("Failed to update task");
            }

            if (successMessage) {
                toast.success(successMessage);
            }
            await loadData(true);
        } catch (error) {
            console.error(error);
            toast.error("Could not update task");
        } finally {
            setUpdatingTaskId(null);
        }
    };

    const createTask = async () => {
        const title = taskForm.title.trim();
        if (!title) {
            toast.error("Task title is required");
            return;
        }

        setCreatingTask(true);
        try {
            const response = await fetch("/api/crm/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    priority: taskForm.priority,
                    assignedToId: taskForm.assignedToId || null,
                    dealId: taskForm.dealId || null,
                    dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : null,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to create task");
            }

            setTaskForm({
                title: "",
                priority: "medium",
                assignedToId: "",
                dealId: "",
                dueDate: "",
            });
            toast.success("Task created");
            await loadData(true);
        } catch (error) {
            console.error(error);
            toast.error("Could not create task");
        } finally {
            setCreatingTask(false);
        }
    };

    const clearTaskFilters = () => {
        setTaskSearch("");
        setTaskStatusFilter("all");
        setTaskPriorityFilter("all");
        setTaskAssigneeFilter("all");
        setOnlyMine(false);
        setOnlyUrgent(false);
    };

    if (loading) {
        return (
            <div className="h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
        );
    }

    if (!overview) {
        return <div className="text-red-400">CRM overview unavailable.</div>;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-10">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/70 mb-2">Micro PE Execution CRM</p>
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Deal Ops Control Deck</h1>
                    <p className="text-[var(--text-muted)] mt-2">
                        High-velocity command center for pipeline ownership, task triage, and investor-grade execution discipline.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Link href="/crm/attendance" className="btn-secondary">
                        Intern Hours
                    </Link>
                    <button
                        onClick={() => loadData(true)}
                        className="btn-secondary flex items-center gap-2"
                        disabled={refreshing}
                    >
                        {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Refresh
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-cyan-500/0 p-4">
                    <p className="text-xs uppercase text-cyan-200/80">Pipeline Coverage</p>
                    <p className="text-2xl font-bold text-white mt-1">{overview.pipeline.ownerCoveragePct}%</p>
                    <p className="text-xs text-cyan-200/60 mt-1">Deals with clear owners</p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/0 p-4">
                    <p className="text-xs uppercase text-emerald-200/80">Action Coverage</p>
                    <p className="text-2xl font-bold text-white mt-1">{overview.pipeline.nextActionCoveragePct}%</p>
                    <p className="text-xs text-emerald-200/60 mt-1">Deals with next step set</p>
                </div>
                <div className="rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-rose-500/0 p-4">
                    <p className="text-xs uppercase text-rose-200/80">Urgent Tasks</p>
                    <p className="text-2xl font-bold text-white mt-1">{overview.tasks.overdue + overview.tasks.dueToday}</p>
                    <p className="text-xs text-rose-200/60 mt-1">Overdue + due today</p>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-500/0 p-4">
                    <p className="text-xs uppercase text-amber-200/80">Critical Deals</p>
                    <p className="text-2xl font-bold text-white mt-1">{criticalDeals.length}</p>
                    <p className="text-xs text-amber-200/60 mt-1">Risk-scored watchlist</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-400" />
                        <h2 className="font-semibold text-white">Critical Deal Radar</h2>
                    </div>
                    {criticalDeals.length === 0 ? (
                        <p className="text-sm text-[var(--text-muted)]">No critical signals. Pipeline hygiene is strong right now.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {criticalDeals.slice(0, 8).map((deal) => (
                                <div key={deal.id} className="border border-[var(--border)] rounded-lg p-3 bg-[var(--background)]/60">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-white text-sm font-semibold line-clamp-1">{deal.name}</p>
                                            <p className="text-xs text-[var(--text-dim)]">{deal.sourceName || "Unknown source"} • {deal.status}</p>
                                        </div>
                                        <span className="text-xs px-2 py-1 rounded border border-rose-500/30 text-rose-300 bg-rose-500/10">
                                            Risk {deal.riskScore}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {deal.signals.slice(0, 3).map((signal) => (
                                            <span key={`${deal.id}-${signal}`} className="text-[10px] px-2 py-1 rounded bg-zinc-500/10 text-zinc-300 border border-zinc-500/20">
                                                {signalLabel(signal)}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] mt-2">
                                        Next action: {deal.nextAction ? deal.nextAction : "Not set"}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-cyan-400" />
                        <h2 className="font-semibold text-white">Execution Pulse</h2>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between border border-[var(--border)]/70 rounded-lg px-3 py-2">
                            <span className="text-[var(--text-muted)]">Overdue next actions</span>
                            <span className="text-rose-300 font-semibold">{overview.pipeline.overdueNextActions}</span>
                        </div>
                        <div className="flex items-center justify-between border border-[var(--border)]/70 rounded-lg px-3 py-2">
                            <span className="text-[var(--text-muted)]">Next actions due today</span>
                            <span className="text-amber-300 font-semibold">{overview.pipeline.dueTodayNextActions}</span>
                        </div>
                        <div className="flex items-center justify-between border border-[var(--border)]/70 rounded-lg px-3 py-2">
                            <span className="text-[var(--text-muted)]">Tasks due in 24h</span>
                            <span className="text-cyan-300 font-semibold">{overview.tasks.dueNext24h}</span>
                        </div>
                        <div className="flex items-center justify-between border border-[var(--border)]/70 rounded-lg px-3 py-2">
                            <span className="text-[var(--text-muted)]">Blocked tasks</span>
                            <span className="text-orange-300 font-semibold">{overview.tasks.blocked}</span>
                        </div>
                    </div>
                    <p className="text-xs text-[var(--text-dim)]">
                        Recommended owner balance: {recommendedOwner ? recommendedOwner.username : "No recommendation available"}.
                    </p>
                </div>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <h2 className="font-semibold text-white">Team Productivity (Last 14 Days)</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[var(--text-dim)] border-b border-[var(--border)]">
                                <th className="py-2 pr-3">Member</th>
                                <th className="py-2 pr-3">Deals</th>
                                <th className="py-2 pr-3">High Priority</th>
                                <th className="py-2 pr-3">Open Tasks</th>
                                <th className="py-2 pr-3">Scans</th>
                                <th className="py-2 pr-3">Deal Updates</th>
                                <th className="py-2 pr-3">Activity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teamMembers.map((member) => (
                                <tr key={member.id} className="border-b border-[var(--border)]/40">
                                    <td className="py-2 pr-3">
                                        <p className="text-white font-medium">{member.username}</p>
                                        <p className="text-xs text-[var(--text-dim)]">{member.role}</p>
                                    </td>
                                    <td className="py-2 pr-3 text-white">{member.ownedDeals}</td>
                                    <td className="py-2 pr-3 text-amber-400">{member.highPriorityDeals}</td>
                                    <td className="py-2 pr-3 text-cyan-300">{member.openTasks}</td>
                                    <td className="py-2 pr-3">{member.scanCount14d}</td>
                                    <td className="py-2 pr-3">{member.dealUpdates14d}</td>
                                    <td className="py-2 pr-3">{member.activityCount14d}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <h2 className="font-semibold text-white">Follow-up Queue</h2>
                </div>
                {queue.length === 0 ? (
                    <p className="text-[var(--text-muted)] text-sm">No stale or unassigned deals. Great momentum.</p>
                ) : (
                    <div className="space-y-3">
                        {queue.map((deal) => {
                            const edit = dealEdits[deal.id];
                            if (!edit) return null;
                            const critical = criticalDealMap.get(deal.id);

                            return (
                                <div key={deal.id} className="grid grid-cols-1 lg:grid-cols-12 gap-2 border border-[var(--border)] rounded-lg p-3 bg-[var(--background)]/40">
                                    <div className="lg:col-span-3">
                                        <div className="flex items-center gap-2">
                                            <p className="text-white font-medium line-clamp-1">{deal.name}</p>
                                            {critical && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded border border-rose-500/25 text-rose-300">
                                                    R{critical.riskScore}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-[var(--text-dim)]">{deal.sourceName || "Unknown source"} • {deal.status}</p>
                                        {critical && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {critical.signals.slice(0, 2).map((signal) => (
                                                    <span key={`${deal.id}-${signal}`} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-300 border border-zinc-500/20">
                                                        {signalLabel(signal)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <select
                                        className="bg-[var(--background)] border border-[var(--border)] rounded px-2 py-1 text-sm lg:col-span-2"
                                        value={edit.ownerId}
                                        onChange={(event) => updateDealEdit(deal.id, { ownerId: event.target.value })}
                                    >
                                        <option value="">Unassigned</option>
                                        {teamMembers.map((member) => (
                                            <option key={member.id} value={member.id}>{member.username}</option>
                                        ))}
                                    </select>
                                    <select
                                        className="bg-[var(--background)] border border-[var(--border)] rounded px-2 py-1 text-sm lg:col-span-1"
                                        value={edit.priority}
                                        onChange={(event) => updateDealEdit(deal.id, { priority: event.target.value })}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                    <input
                                        className="bg-[var(--background)] border border-[var(--border)] rounded px-2 py-1 text-sm lg:col-span-2"
                                        placeholder="Next action"
                                        value={edit.nextAction}
                                        onChange={(event) => updateDealEdit(deal.id, { nextAction: event.target.value })}
                                    />
                                    <input
                                        type="datetime-local"
                                        className="bg-[var(--background)] border border-[var(--border)] rounded px-2 py-1 text-sm lg:col-span-2"
                                        value={edit.nextActionAt}
                                        onChange={(event) => updateDealEdit(deal.id, { nextActionAt: event.target.value })}
                                    />
                                    <div className="lg:col-span-2 flex gap-2">
                                        <button
                                            onClick={() => {
                                                if (!recommendedOwnerId) return;
                                                updateDealEdit(deal.id, { ownerId: recommendedOwnerId });
                                            }}
                                            className="btn-secondary text-xs flex-1"
                                            disabled={!recommendedOwnerId || savingDealId === deal.id}
                                            title={recommendedOwner ? `Assign to lowest-load owner: ${recommendedOwner.username}` : "No recommendation"}
                                        >
                                            Auto
                                        </button>
                                        <button
                                            onClick={() => saveDeal(deal.id)}
                                            className="btn-primary text-sm flex-1 flex items-center justify-center gap-1"
                                            disabled={savingDealId === deal.id}
                                        >
                                            {savingDealId === deal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Save
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-1 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <PlusCircle className="w-4 h-4 text-emerald-400" />
                        <h2 className="font-semibold text-white">New Task</h2>
                    </div>
                    <input
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm"
                        placeholder="Task title"
                        value={taskForm.title}
                        onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))}
                    />
                    <select
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm"
                        value={taskForm.priority}
                        onChange={(event) => setTaskForm((prev) => ({ ...prev, priority: event.target.value }))}
                    >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                    </select>
                    <select
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm"
                        value={taskForm.assignedToId}
                        onChange={(event) => setTaskForm((prev) => ({ ...prev, assignedToId: event.target.value }))}
                    >
                        <option value="">Assign to team member</option>
                        {teamMembers.map((member) => (
                            <option key={member.id} value={member.id}>{member.username}</option>
                        ))}
                    </select>
                    <select
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm"
                        value={taskForm.dealId}
                        onChange={(event) => setTaskForm((prev) => ({ ...prev, dealId: event.target.value }))}
                    >
                        <option value="">Attach to deal (optional)</option>
                        {queue.map((deal) => (
                            <option key={deal.id} value={deal.id}>{deal.name}</option>
                        ))}
                    </select>
                    <input
                        type="datetime-local"
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm"
                        value={taskForm.dueDate}
                        onChange={(event) => setTaskForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                    />
                    <button
                        onClick={createTask}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                        disabled={creatingTask}
                    >
                        {creatingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                        Create Task
                    </button>
                </div>

                <div className="xl:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-cyan-400" />
                        <h2 className="font-semibold text-white">Execution Board</h2>
                    </div>

                    <div className="rounded-lg border border-[var(--border)] bg-[var(--background)]/50 p-3 space-y-3">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-cyan-300" />
                            <p className="text-sm text-white font-medium">Focus Filters</p>
                            <span className="ml-auto text-xs text-[var(--text-dim)]">
                                {filteredTasks.length}/{tasks.length} tasks visible
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                                <input
                                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded pl-8 pr-2 py-2 text-sm"
                                    placeholder="Search tasks, deal, owner"
                                    value={taskSearch}
                                    onChange={(event) => setTaskSearch(event.target.value)}
                                />
                            </div>
                            <select
                                className="bg-[var(--background)] border border-[var(--border)] rounded px-2 py-2 text-sm"
                                value={taskStatusFilter}
                                onChange={(event) => setTaskStatusFilter(event.target.value)}
                            >
                                <option value="all">All statuses</option>
                                <option value="todo">Todo</option>
                                <option value="in_progress">In Progress</option>
                                <option value="blocked">Blocked</option>
                                <option value="done">Done</option>
                            </select>
                            <select
                                className="bg-[var(--background)] border border-[var(--border)] rounded px-2 py-2 text-sm"
                                value={taskPriorityFilter}
                                onChange={(event) => setTaskPriorityFilter(event.target.value)}
                            >
                                <option value="all">All priorities</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                            <select
                                className="bg-[var(--background)] border border-[var(--border)] rounded px-2 py-2 text-sm"
                                value={taskAssigneeFilter}
                                onChange={(event) => setTaskAssigneeFilter(event.target.value)}
                            >
                                <option value="all">All assignees</option>
                                <option value="unassigned">Unassigned</option>
                                {teamMembers.map((member) => (
                                    <option key={member.id} value={member.id}>{member.username}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <label className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={onlyMine}
                                    onChange={(event) => setOnlyMine(event.target.checked)}
                                />
                                Only my tasks
                            </label>
                            <label className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={onlyUrgent}
                                    onChange={(event) => setOnlyUrgent(event.target.checked)}
                                />
                                Only urgent
                            </label>
                            <button className="btn-secondary text-xs px-2 py-1" onClick={clearTaskFilters}>
                                Reset filters
                            </button>
                            <div className="ml-auto flex items-center gap-2 text-xs text-[var(--text-dim)]">
                                <TimerReset className="w-3 h-3" />
                                {visibleUrgentTaskCount} urgent in current view
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 max-h-[560px] overflow-auto pr-1">
                        {filteredTasks.length === 0 && (
                            <p className="text-sm text-[var(--text-muted)]">No tasks match current filters.</p>
                        )}
                        {filteredTasks.map((task) => {
                            const due = getDueMeta(task.dueDate, task.status);
                            const statusClass =
                                task.status === "done"
                                    ? "border-emerald-500/25"
                                    : task.status === "blocked"
                                        ? "border-rose-500/25"
                                        : task.status === "in_progress"
                                            ? "border-cyan-500/25"
                                            : "border-[var(--border)]";

                            return (
                                <div key={task.id} className={`rounded-lg border ${statusClass} p-3 bg-[var(--background)]/35`}>
                                    <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <p className="text-white text-sm font-semibold line-clamp-1">{task.title}</p>
                                                <span className="text-[10px] px-2 py-1 rounded border border-zinc-500/25 text-zinc-300 bg-zinc-500/10">
                                                    {task.priority}
                                                </span>
                                                <span className={`text-[10px] px-2 py-1 rounded ${due.badgeClass}`}>
                                                    {due.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-[var(--text-dim)]">
                                                {task.assignedTo?.username || "Unassigned"} • {task.deal?.name || "No linked deal"} • Due: {formatDateTime(task.dueDate)}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            {task.status !== "in_progress" && task.status !== "done" && (
                                                <button
                                                    className="btn-secondary text-xs px-2 py-1"
                                                    onClick={() => patchTask(task.id, { status: "in_progress" }, "Task moved to in progress")}
                                                    disabled={updatingTaskId === task.id}
                                                >
                                                    Start
                                                </button>
                                            )}
                                            {task.status !== "done" && (
                                                <button
                                                    className="btn-secondary text-xs px-2 py-1 !text-emerald-300"
                                                    onClick={() => patchTask(task.id, { status: "done" }, "Task completed")}
                                                    disabled={updatingTaskId === task.id}
                                                >
                                                    Done
                                                </button>
                                            )}
                                            <button
                                                className="btn-secondary text-xs px-2 py-1"
                                                onClick={() => {
                                                    const base = task.dueDate ? new Date(task.dueDate) : new Date();
                                                    base.setDate(base.getDate() + 1);
                                                    void patchTask(task.id, { dueDate: base.toISOString() }, "Task snoozed by 1 day");
                                                }}
                                                disabled={updatingTaskId === task.id}
                                            >
                                                +1 day
                                            </button>
                                            <select
                                                className="bg-[var(--background)] border border-[var(--border)] rounded px-2 py-1 text-sm"
                                                value={task.status}
                                                onChange={(event) => patchTask(task.id, { status: event.target.value })}
                                                disabled={updatingTaskId === task.id}
                                            >
                                                <option value="todo">Todo</option>
                                                <option value="in_progress">In Progress</option>
                                                <option value="blocked">Blocked</option>
                                                <option value="done">Done</option>
                                            </select>
                                            <div className="w-6 flex justify-center">
                                                {task.status === "done" ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                ) : (
                                                    <AlertTriangle className={`w-4 h-4 ${task.priority === "high" ? "text-rose-400" : "text-zinc-500"}`} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="text-xs text-[var(--text-dim)] flex items-center justify-between">
                        <span>Tip: use Only urgent + Only my tasks at shift start to run daily triage in under 2 minutes.</span>
                        <span className="hidden sm:inline-flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Updated {new Date(overview.generatedAt).toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
