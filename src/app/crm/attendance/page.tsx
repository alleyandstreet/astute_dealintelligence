"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
    CalendarClock,
    Loader2,
    PlayCircle,
    RefreshCw,
    StopCircle,
    Timer,
    Users,
} from "lucide-react";

type AttendanceRecord = {
    id: string;
    userId: string;
    clockInAt: string;
    clockOutAt: string | null;
    durationMinutes: number;
    status: "active" | "closed";
    user: { id: string; username: string; email?: string | null; role: string };
};

type InternSummary = {
    id: string;
    username: string;
    email?: string | null;
    role: string;
    activeSession: AttendanceRecord | null;
    totalSessions: number;
    todayMinutes: number;
    weekMinutes: number;
    rangeMinutes: number;
};

type AttendanceResponse = {
    generatedAt: string;
    currentUserId: string | null;
    currentUserRole: string | null;
    canClock: boolean;
    activeSession: AttendanceRecord | null;
    summary: {
        trackedTodayMinutes: number;
        activeInterns: number;
        totalSessions: number;
    };
    interns: InternSummary[];
    records: AttendanceRecord[];
};

function formatMinutes(minutes: number): string {
    const safeMinutes = Math.max(0, minutes || 0);
    const hours = Math.floor(safeMinutes / 60);
    const mins = safeMinutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
}

function formatDateTime(value: string | null): string {
    if (!value) return "Active";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Invalid date";
    return date.toLocaleString();
}

function formatPeriod(record: AttendanceRecord): string {
    const start = new Date(record.clockInAt);
    const end = record.clockOutAt ? new Date(record.clockOutAt) : null;
    if (Number.isNaN(start.getTime())) return "-";
    const startText = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const endText = end ? end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Running";
    return `${startText} - ${endText}`;
}

export default function CrmAttendancePage() {
    const [data, setData] = useState<AttendanceResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const loadData = async (silent = false) => {
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const response = await fetch("/api/crm/attendance?days=30");
            if (!response.ok) {
                throw new Error("Failed to fetch attendance data");
            }
            const payload = (await response.json()) as AttendanceResponse;
            setData(payload);
        } catch (error) {
            console.error(error);
            toast.error("Could not load attendance data");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onClockAction = async (action: "clock_in" | "clock_out") => {
        setSubmitting(true);
        try {
            const response = await fetch("/api/crm/attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result?.error || "Failed to update attendance");
            }

            toast.success(action === "clock_in" ? "Clocked in successfully" : "Clocked out successfully");
            await loadData(true);
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Attendance update failed");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
        );
    }

    if (!data) {
        return <div className="text-rose-400">Attendance workspace unavailable.</div>;
    }

    const todayHours = (data.summary.trackedTodayMinutes / 60).toFixed(2);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-widest text-[var(--text-dim)] mb-1">Team CRM</p>
                    <h1 className="text-3xl font-bold text-white">Intern Attendance</h1>
                    <p className="text-[var(--text-muted)]">Track clock in/out, working period, and total hours in one place.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/crm" className="btn-secondary">
                        Back to CRM
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                    <p className="text-xs uppercase text-[var(--text-dim)]">Tracked Today</p>
                    <p className="text-2xl font-bold text-cyan-300">{todayHours}h</p>
                </div>
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                    <p className="text-xs uppercase text-[var(--text-dim)]">Active Interns</p>
                    <p className="text-2xl font-bold text-emerald-300">{data.summary.activeInterns}</p>
                </div>
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                    <p className="text-xs uppercase text-[var(--text-dim)]">Sessions (30d)</p>
                    <p className="text-2xl font-bold text-white">{data.summary.totalSessions}</p>
                </div>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Timer className="w-4 h-4 text-amber-300" />
                    <h2 className="text-white font-semibold">My Clock</h2>
                </div>
                {data.canClock ? (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <p className="text-sm text-[var(--text-muted)]">
                            {data.activeSession
                                ? `You clocked in at ${formatDateTime(data.activeSession.clockInAt)}`
                                : "You are currently clocked out"}
                        </p>
                        <button
                            onClick={() => onClockAction(data.activeSession ? "clock_out" : "clock_in")}
                            className={`btn-primary flex items-center gap-2 ${data.activeSession ? "!bg-rose-500 hover:!bg-rose-600" : ""}`}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : data.activeSession ? (
                                <StopCircle className="w-4 h-4" />
                            ) : (
                                <PlayCircle className="w-4 h-4" />
                            )}
                            {data.activeSession ? "Clock Out" : "Clock In"}
                        </button>
                    </div>
                ) : (
                    <p className="text-sm text-[var(--text-muted)]">
                        Clock controls are available for accounts with role set to <code className="text-amber-300 font-medium">intern</code>.
                    </p>
                )}
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <h2 className="text-white font-semibold">Intern Hour Summary</h2>
                </div>
                {data.interns.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">No active users with role <code>intern</code> yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[var(--text-dim)] border-b border-[var(--border)]">
                                    <th className="py-2 pr-3">Intern</th>
                                    <th className="py-2 pr-3">Status</th>
                                    <th className="py-2 pr-3">Today</th>
                                    <th className="py-2 pr-3">Last 7d</th>
                                    <th className="py-2 pr-3">Last 30d</th>
                                    <th className="py-2 pr-3">Sessions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.interns.map((intern) => (
                                    <tr key={intern.id} className="border-b border-[var(--border)]/40">
                                        <td className="py-2 pr-3">
                                            <p className="text-white font-medium">{intern.username}</p>
                                            <p className="text-xs text-[var(--text-dim)]">{intern.email || "No email"}</p>
                                        </td>
                                        <td className="py-2 pr-3">
                                            <span
                                                className={`px-2 py-1 rounded text-xs font-medium border ${intern.activeSession
                                                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                                    : "bg-zinc-500/10 text-zinc-300 border-zinc-500/20"
                                                    }`}
                                            >
                                                {intern.activeSession ? "Clocked In" : "Clocked Out"}
                                            </span>
                                        </td>
                                        <td className="py-2 pr-3 text-white">{formatMinutes(intern.todayMinutes)}</td>
                                        <td className="py-2 pr-3 text-white">{formatMinutes(intern.weekMinutes)}</td>
                                        <td className="py-2 pr-3 text-white">{formatMinutes(intern.rangeMinutes)}</td>
                                        <td className="py-2 pr-3 text-cyan-300">{intern.totalSessions}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <CalendarClock className="w-4 h-4 text-amber-300" />
                    <h2 className="text-white font-semibold">Attendance Records (Latest)</h2>
                </div>
                {data.records.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">No attendance records yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[var(--text-dim)] border-b border-[var(--border)]">
                                    <th className="py-2 pr-3">Intern</th>
                                    <th className="py-2 pr-3">Clock In</th>
                                    <th className="py-2 pr-3">Clock Out</th>
                                    <th className="py-2 pr-3">Working Period</th>
                                    <th className="py-2 pr-3">Worked Hours</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.records.map((record) => (
                                    <tr key={record.id} className="border-b border-[var(--border)]/40">
                                        <td className="py-2 pr-3">
                                            <p className="text-white font-medium">{record.user.username}</p>
                                            <p className="text-xs text-[var(--text-dim)]">{record.user.role}</p>
                                        </td>
                                        <td className="py-2 pr-3 text-white">{formatDateTime(record.clockInAt)}</td>
                                        <td className="py-2 pr-3 text-white">{formatDateTime(record.clockOutAt)}</td>
                                        <td className="py-2 pr-3 text-amber-300">{formatPeriod(record)}</td>
                                        <td className="py-2 pr-3 text-cyan-300">{(record.durationMinutes / 60).toFixed(2)}h</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
