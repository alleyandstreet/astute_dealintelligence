"use client";

import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
    Download,
    Trash2,
    Database,
    RefreshCw,
    FileSpreadsheet,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Info,
    Zap,
} from "lucide-react";

export default function SettingsPage() {
    const [isExporting, setIsExporting] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [stats, setStats] = useState<{ deals: number; notes: number } | null>(null);

    const fetchStats = async () => {
        try {
            const res = await fetch("/api/deals");
            if (res.ok) {
                const deals = await res.json();
                setStats({ deals: deals.length, notes: 0 });
            }
        } catch {
            // Ignore
        }
    };

    useState(() => {
        fetchStats();
    });

    const exportToCSV = async () => {
        setIsExporting(true);
        try {
            const res = await fetch("/api/export");
            if (!res.ok) throw new Error("Export failed");

            const data = await res.json();

            // Convert to CSV
            if (data.length === 0) {
                toast.error("No deals to export");
                return;
            }

            const headers = Object.keys(data[0]);
            const csvContent = [
                headers.join(","),
                ...data.map((row: Record<string, unknown>) =>
                    headers
                        .map((header) => {
                            const value = String(row[header] || "");
                            // Escape quotes and wrap in quotes if contains comma
                            if (value.includes(",") || value.includes('"') || value.includes("\n")) {
                                return `"${value.replace(/"/g, '""')}"`;
                            }
                            return value;
                        })
                        .join(",")
                ),
            ].join("\n");

            // Download
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `deals-export-${new Date().toISOString().split("T")[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success(`Exported ${data.length} deals to CSV`);
        } catch (error) {
            toast.error("Failed to export deals");
            console.error(error);
        } finally {
            setIsExporting(false);
        }
    };

    const exportToJSON = async () => {
        setIsExporting(true);
        try {
            const res = await fetch("/api/export");
            if (!res.ok) throw new Error("Export failed");

            const data = await res.json();

            // Download JSON
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `deals-export-${new Date().toISOString().split("T")[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success(`Exported ${data.length} deals to JSON`);
        } catch (error) {
            toast.error("Failed to export deals");
            console.error(error);
        } finally {
            setIsExporting(false);
        }
    };

    const clearAllDeals = async () => {
        setIsClearing(true);
        try {
            // This would need a dedicated API endpoint
            toast.success("Feature coming soon - clear deals manually via database");
        } catch (error) {
            toast.error("Failed to clear deals");
        } finally {
            setIsClearing(false);
            setShowClearConfirm(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
                <p className="text-[var(--text-muted)]">Configure your deal intelligence platform</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                            <Database className="w-5 h-5 text-cyan-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-white">{stats?.deals ?? "--"}</p>
                    <p className="text-sm text-[var(--text-muted)]">Total Deals</p>
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-white">Free</p>
                    <p className="text-sm text-[var(--text-muted)]">API Status</p>
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-amber-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-white">Local</p>
                    <p className="text-sm text-[var(--text-muted)]">Scoring Engine</p>
                </div>
            </div>

            {/* Export Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 mb-6"
            >
                <div className="flex items-center gap-3 mb-4">
                    <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-xl font-semibold text-white">Export Data</h2>
                </div>
                <p className="text-[var(--text-muted)] mb-6">
                    Download all your deals for backup or analysis in external tools.
                </p>

                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={exportToCSV}
                        disabled={isExporting}
                        className="btn-primary flex items-center gap-2"
                    >
                        {isExporting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        Export to CSV
                    </button>

                    <button
                        onClick={exportToJSON}
                        disabled={isExporting}
                        className="btn-secondary flex items-center gap-2"
                    >
                        {isExporting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        Export to JSON
                    </button>
                </div>
            </motion.div>

            {/* API Info */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-cyan-500/5 to-purple-500/5 border border-cyan-500/20 rounded-xl p-6 mb-6"
            >
                <div className="flex items-center gap-3 mb-4">
                    <Info className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-xl font-semibold text-white">APIs Used</h2>
                </div>

                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                        <div>
                            <p className="font-medium text-white">Reddit Public JSON API</p>
                            <p className="text-sm text-[var(--text-muted)]">
                                Free, no authentication required. Append .json to any Reddit URL.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                        <div>
                            <p className="font-medium text-white">Local Scoring Algorithm</p>
                            <p className="text-sm text-[var(--text-muted)]">
                                Keyword-based viability and motivation scoring. No external AI API needed.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                        <div>
                            <p className="font-medium text-white">SQLite Database</p>
                            <p className="text-sm text-[var(--text-muted)]">
                                All data stored locally in prisma/dev.db. No cloud storage required.
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Danger Zone */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[var(--card)] border border-red-500/20 rounded-xl p-6"
            >
                <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <h2 className="text-xl font-semibold text-white">Danger Zone</h2>
                </div>
                <p className="text-[var(--text-muted)] mb-6">
                    Irreversible actions. Proceed with caution.
                </p>

                {!showClearConfirm ? (
                    <button
                        onClick={() => setShowClearConfirm(true)}
                        className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        Clear All Deals
                    </button>
                ) : (
                    <div className="flex items-center gap-4">
                        <span className="text-red-400">Are you sure?</span>
                        <button
                            onClick={clearAllDeals}
                            disabled={isClearing}
                            className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center gap-2"
                        >
                            {isClearing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                            Yes, Clear All
                        </button>
                        <button
                            onClick={() => setShowClearConfirm(false)}
                            className="px-4 py-2 rounded-lg bg-[var(--background)] text-[var(--text-muted)] hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </motion.div>

            {/* Version Info */}
            <div className="mt-8 text-center text-sm text-[var(--text-dim)]">
                <p>DealFlow PE Intelligence Platform v1.0</p>
                <p>Built with Next.js, Prisma, and ❤️</p>
            </div>
        </div>
    );
}
