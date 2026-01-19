"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AdminLayout from "@/components/AdminLayout";
import { Search, Filter } from "lucide-react";

interface ActivityLog {
    id: string;
    createdAt: string;
    action: string;
    details?: string;
    ipAddress?: string;
    user: {
        username: string;
        email?: string;
    };
}

export default function LogsPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        action: "",
        search: "",
        limit: 50,
        offset: 0,
    });

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated" && (session?.user as any)?.role !== "super_admin") {
            router.push("/");
        }
    }, [status, session, router]);

    useEffect(() => {
        if ((session?.user as any)?.role === "super_admin") {
            fetchLogs();
        }
    }, [session, filters]);

    const fetchLogs = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.action) params.append("action", filters.action);
            params.append("limit", filters.limit.toString());
            params.append("offset", filters.offset.toString());

            const res = await fetch(`/api/admin/logs?${params}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs);
                setTotal(data.total);
            }
        } catch (error) {
            console.error("Error fetching logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action: string) => {
        const colors: Record<string, string> = {
            login: "bg-green-500/20 text-green-400",
            logout: "bg-slate-500/20 text-slate-400",
            deal_created: "bg-cyan-500/20 text-cyan-400",
            deal_updated: "bg-blue-500/20 text-blue-400",
            deal_deleted: "bg-red-500/20 text-red-400",
            scan_started: "bg-purple-500/20 text-purple-400",
            user_created: "bg-green-500/20 text-green-400",
            user_updated: "bg-yellow-500/20 text-yellow-400",
            user_deleted: "bg-red-500/20 text-red-400",
        };
        return colors[action] || "bg-slate-500/20 text-slate-400";
    };

    if (status === "loading" || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    if ((session?.user as any)?.role !== "super_admin") {
        return null;
    }

    return (
        <AdminLayout>
            <div className="max-w-6xl">
                <h1 className="text-3xl font-bold text-white mb-8">Activity Logs</h1>

                <div className="mb-6 flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        />
                    </div>
                    <select
                        value={filters.action}
                        onChange={(e) => setFilters({ ...filters, action: e.target.value, offset: 0 })}
                        className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    >
                        <option value="">All Actions</option>
                        <option value="login">Login</option>
                        <option value="logout">Logout</option>
                        <option value="deal_created">Deal Created</option>
                        <option value="deal_updated">Deal Updated</option>
                        <option value="deal_deleted">Deal Deleted</option>
                        <option value="scan_started">Scan Started</option>
                        <option value="user_created">User Created</option>
                        <option value="user_updated">User Updated</option>
                        <option value="user_deleted">User Deleted</option>
                    </select>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-900/50">
                            <tr>
                                <th className="text-left p-4 text-slate-400 font-medium">Timestamp</th>
                                <th className="text-left p-4 text-slate-400 font-medium">User</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Action</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Details</th>
                                <th className="text-left p-4 text-slate-400 font-medium">IP Address</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.id} className="border-t border-slate-700/50">
                                    <td className="p-4 text-slate-400">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-white">{log.user.username}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs ${getActionColor(log.action)}`}>
                                            {log.action.replace(/_/g, " ")}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-400">{log.details || "-"}</td>
                                    <td className="p-4 text-slate-400">{log.ipAddress || "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 flex justify-between items-center text-slate-400">
                    <p>
                        Showing {filters.offset + 1} - {Math.min(filters.offset + filters.limit, total)} of{" "}
                        {total}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilters({ ...filters, offset: Math.max(0, filters.offset - filters.limit) })}
                            disabled={filters.offset === 0}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}
                            disabled={filters.offset + filters.limit >= total}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
