"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
    Calendar,
    Filter,
    Download,
    Search,
    Loader2,
    ExternalLink,
    Twitter,
    Linkedin,
    Globe,
    Mail,
    ArrowUpDown,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    ArrowLeft,
    User,
    Plus
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/GlassCard";
import MultiDatePicker from "@/components/MultiDatePicker";

interface ProductHuntListing {
    name: string;
    tagline: string;
    upvotes: number;
    productHuntUrl: string;
    productWebsiteUrl: string;
    makerNames: string[];
    contactLinks: {
        twitter?: string;
        linkedin?: string;
        website?: string;
        email?: string;
    };
    categories: string[];
    sourceDate?: string;
}

export default function ProductHuntGroundedPage() {
    const [dates, setDates] = useState<Date[]>([new Date()]);
    const [minUpvotes, setMinUpvotes] = useState(20);
    const [maxUpvotes, setMaxUpvotes] = useState(0);
    const [isScanning, setIsScanning] = useState(false);
    const [results, setResults] = useState<ProductHuntListing[]>([]);
    const [statusMessage, setStatusMessage] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: keyof ProductHuntListing, direction: 'asc' | 'desc' }>({ key: 'upvotes', direction: 'desc' });
    const [pushingSourceIds, setPushingSourceIds] = useState<Set<string>>(new Set());
    const [pushedSourceIds, setPushedSourceIds] = useState<Set<string>>(new Set());

    const handleScan = async () => {
        if (dates.length === 0) {
            toast.error("Select at least one target date.");
            return;
        }
        setIsScanning(true);
        setResults([]);
        setStatusMessage("Initializing grounded search...");

        try {
            const dateValues = dates
                .map((d) => format(d, "yyyy-MM-dd"))
                .sort();
            const response = await fetch("/api/scan/producthunt-grounded", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dates: dateValues, minUpvotes, maxUpvotes }),
            });

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split("\n\n");
                buffer = parts.pop() || "";

                for (const part of parts) {
                    const line = part.trim();
                    if (!line.startsWith("data: ")) continue;
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.type === "status") {
                            setStatusMessage(data.message);
                        } else if (data.type === "log") {
                            // Optional: handle logs if needed
                            console.log(data.message);
                        } else if (data.type === "complete") {
                            setResults(data.data || []);
                            toast.success(`Extracted ${data.data?.length || 0} products!`);
                        } else if (data.type === "error") {
                            toast.error(data.message);
                            setStatusMessage("Error: " + data.message);
                        }
                    } catch (e) {
                        console.error("Parse error", e);
                    }
                }
            }
        } catch (error: any) {
            toast.error("Scan failed: " + error.message);
            setStatusMessage("Scan failed.");
        } finally {
            setIsScanning(false);
        }
    };

    const sortedResults = [...results].sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();

        if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const toggleSort = (key: keyof ProductHuntListing) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const exportToCSV = () => {
        if (results.length === 0) return;

        const headers = ["Date", "Name", "Tagline", "Upvotes", "Product Hunt URL", "Website URL", "Makers", "Twitter", "LinkedIn", "Categories"];
        const rows = results.map(p => [
            p.sourceDate || "",
            `"${p.name.replace(/"/g, '""')}"`,
            `"${p.tagline.replace(/"/g, '""')}"`,
            p.upvotes,
            p.productHuntUrl,
            p.productWebsiteUrl,
            `"${p.makerNames.join(", ")}"`,
            p.contactLinks.twitter || "",
            p.contactLinks.linkedin || "",
            `"${p.categories.join(", ")}"`
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        const dateValues = dates.length
            ? dates.map((d) => format(d, "yyyy-MM-dd")).sort()
            : ["unknown_date"];
        const fileSuffix = dateValues.length > 1 ? `${dateValues[0]}_to_${dateValues[dateValues.length - 1]}` : dateValues[0];
        link.setAttribute("download", `producthunt_scrape_${fileSuffix}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getProductSourceId = (product: ProductHuntListing) => {
        return `producthunt_grounded:${product.productHuntUrl.trim().toLowerCase()}`;
    };

    const handlePushToPipeline = async (product: ProductHuntListing) => {
        const sourceId = getProductSourceId(product);

        if (pushingSourceIds.has(sourceId) || pushedSourceIds.has(sourceId)) return;

        setPushingSourceIds((prev) => {
            const next = new Set(prev);
            next.add(sourceId);
            return next;
        });

        try {
            const response = await fetch("/api/deals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: product.name,
                    description: product.tagline,
                    industry: product.categories?.[0] || null,
                    url: product.productWebsiteUrl || null,
                    source: "producthunt_grounded",
                    sourceId,
                    sourceName: "Product Hunt Grounded",
                    redditUrl: product.productHuntUrl || null,
                    contactWebsite: product.contactLinks.website || product.productWebsiteUrl || null,
                    contactEmail: product.contactLinks.email || null,
                    contactTwitter: product.contactLinks.twitter || null,
                    contactLinkedIn: product.contactLinks.linkedin || null,
                    businessType: product.categories.length ? product.categories.join(", ") : null,
                    status: "new_leads",
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                if (response.status === 409) {
                    setPushedSourceIds((prev) => {
                        const next = new Set(prev);
                        next.add(sourceId);
                        return next;
                    });
                    toast.info(`${product.name} is already in pipeline`);
                    return;
                }

                throw new Error(data.error || "Failed to push to pipeline");
            }

            setPushedSourceIds((prev) => {
                const next = new Set(prev);
                next.add(sourceId);
                return next;
            });
            toast.success(`Pushed ${product.name} to pipeline`);
        } catch (error: any) {
            toast.error(error.message || "Failed to push to pipeline");
        } finally {
            setPushingSourceIds((prev) => {
                const next = new Set(prev);
                next.delete(sourceId);
                return next;
            });
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8">
            {/* Back Link */}
            <Link
                href="/sources"
                className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-medium group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to Sources
            </Link>

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#DA552F]/10 flex items-center justify-center">
                            <Search className="w-5 h-5 text-[#DA552F]" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-white">
                            Product Hunt <span className="text-[#DA552F]">Grounded</span> Scraper
                        </h1>
                    </div>
                    <p className="text-zinc-500 text-sm font-medium">
                        Deep intelligence extraction powered by Gemini 2.0 & Google Search
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={exportToCSV}
                        disabled={results.length === 0}
                        className="btn-secondary flex items-center gap-2 h-11 px-4 disabled:opacity-30"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                    <button
                        onClick={handleScan}
                        disabled={isScanning}
                        className="btn-primary !bg-[#DA552F] hover:!bg-[#bf4a29] flex items-center gap-2 h-11 px-6 shadow-lg shadow-[#DA552F]/20"
                    >
                        {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                        {isScanning ? "Scraping..." : "Run Grounded Scan"}
                    </button>
                </div>
            </div>

            {/* Controls Bar */}
            <GlassCard className="p-6 border-white/5" intensity="low">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-[#DA552F]" />
                            Target Dates
                        </label>
                        <MultiDatePicker
                            value={dates}
                            onChange={setDates}
                            placeholder="Select dates"
                            accent="amber"
                            maxDate={new Date()}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                            <Filter className="w-3 h-3 text-[#DA552F]" />
                            Min. Upvotes
                        </label>
                        <input
                            type="number"
                            value={minUpvotes}
                            onChange={(e) => setMinUpvotes(parseInt(e.target.value) || 0)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-[#DA552F]/50 outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                            <Filter className="w-3 h-3 text-[#DA552F]" />
                            Max. Upvotes
                        </label>
                        <input
                            type="number"
                            value={maxUpvotes}
                            onChange={(e) => setMaxUpvotes(parseInt(e.target.value) || 0)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-[#DA552F]/50 outline-none transition-all"
                        />
                        <p className="text-[11px] text-zinc-500">Set to 0 to disable maximum filtering.</p>
                    </div>

                    <div className="lg:col-span-1 flex items-end">
                        <div className="w-full p-3 rounded-xl bg-[#DA552F]/5 border border-[#DA552F]/20 flex items-center gap-3">
                            {isScanning ? (
                                <Loader2 className="w-4 h-4 text-[#DA552F] animate-spin" />
                            ) : results.length > 0 ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                                <AlertCircle className="w-4 h-4 text-zinc-600" />
                            )}
                            <span className="text-sm font-medium text-zinc-400">
                                {isScanning
                                    ? statusMessage
                                    : results.length > 0
                                        ? `Found ${results.length} products across ${dates.length} date${dates.length === 1 ? "" : "s"}`
                                        : "Ready to scan leaderboard"}
                            </span>
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* Results Table */}
            <AnimatePresence mode="wait">
                {results.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-4"
                    >
                        <GlassCard className="p-0 overflow-hidden border-white/5" intensity="medium">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white/5 border-b border-white/10 text-xs font-bold uppercase tracking-widest text-zinc-500">
                                            <th className="px-6 py-4 cursor-pointer hover:text-white" onClick={() => toggleSort('name')}>
                                                <div className="flex items-center gap-2">Product <ArrowUpDown className="w-3 h-3" /></div>
                                            </th>
                                            <th className="px-6 py-4 cursor-pointer hover:text-white" onClick={() => toggleSort('upvotes')}>
                                                <div className="flex items-center gap-2">Upvotes <ArrowUpDown className="w-3 h-3" /></div>
                                            </th>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Makers & Contact</th>
                                            <th className="px-6 py-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {sortedResults.map((product, idx) => (
                                            <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-6 py-6 max-w-md">
                                                    <div className="space-y-1">
                                                        <h3 className="font-bold text-white group-hover:text-[#DA552F] transition-colors">
                                                            {product.name}
                                                        </h3>
                                                        <p className="text-sm text-zinc-500 line-clamp-1">{product.tagline}</p>
                                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                                            {product.categories.slice(0, 3).map(cat => (
                                                                <span key={cat} className="text-[10px] bg-white/5 text-zinc-400 px-2 py-0.5 rounded border border-white/5 uppercase font-medium">
                                                                    {cat}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-xl font-black text-[#DA552F]">{product.upvotes}</span>
                                                        <span className="text-[10px] text-zinc-600 uppercase font-black tracking-tighter">Reported</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 text-sm text-zinc-400">
                                                    {product.sourceDate || "—"}
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2 text-sm text-zinc-300">
                                                            <User className="w-3 h-3 text-zinc-500" />
                                                            <span className="line-clamp-1">{product.makerNames.join(", ") || "Unknown"}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {product.contactLinks.twitter && (
                                                                <a href={product.contactLinks.twitter} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-black/40 border border-white/5 text-zinc-400 hover:text-sky-400 hover:border-sky-400/30 transition-all">
                                                                    <Twitter className="w-3.5 h-3.5" />
                                                                </a>
                                                            )}
                                                            {product.contactLinks.linkedin && (
                                                                <a href={product.contactLinks.linkedin} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-black/40 border border-white/5 text-zinc-400 hover:text-blue-400 hover:border-blue-400/30 transition-all">
                                                                    <Linkedin className="w-3.5 h-3.5" />
                                                                </a>
                                                            )}
                                                            {product.contactLinks.website && (
                                                                <a href={product.contactLinks.website} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-black/40 border border-white/5 text-zinc-400 hover:text-[#DA552F] hover:border-[#DA552F]/30 transition-all">
                                                                    <Globe className="w-3.5 h-3.5" />
                                                                </a>
                                                            )}
                                                            {product.contactLinks.email && (
                                                                <a href={`mailto:${product.contactLinks.email}`} className="p-1.5 rounded-lg bg-black/40 border border-white/5 text-zinc-400 hover:text-emerald-400 hover:border-emerald-400/30 transition-all">
                                                                    <Mail className="w-3.5 h-3.5" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handlePushToPipeline(product)}
                                                            disabled={pushingSourceIds.has(getProductSourceId(product)) || pushedSourceIds.has(getProductSourceId(product))}
                                                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                                        >
                                                            {pushingSourceIds.has(getProductSourceId(product)) ? (
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                            ) : pushedSourceIds.has(getProductSourceId(product)) ? (
                                                                <CheckCircle2 className="w-3 h-3" />
                                                            ) : (
                                                                <Plus className="w-3 h-3" />
                                                            )}
                                                            {pushingSourceIds.has(getProductSourceId(product))
                                                                ? "Pushing..."
                                                                : pushedSourceIds.has(getProductSourceId(product))
                                                                    ? "Pushed"
                                                                    : "Push to Pipeline"}
                                                        </button>
                                                        <a
                                                            href={product.productHuntUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:border-[#DA552F]/50 transition-all"
                                                            title="View on Product Hunt"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                        <a
                                                            href={product.productWebsiteUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#DA552F]/10 border border-[#DA552F]/20 text-[#DA552F] text-xs font-bold hover:bg-[#DA552F]/20 transition-all"
                                                        >
                                                            Visit Website
                                                            <ChevronRight className="w-3 h-3" />
                                                        </a>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </GlassCard>
                    </motion.div>
                ) : isScanning ? (
                    <div className="h-64 flex flex-col items-center justify-center space-y-4">
                        <div className="relative">
                            <div className="w-12 h-12 border-4 border-[#DA552F]/20 border-t-[#DA552F] rounded-full animate-spin" />
                            <div className="absolute inset-0 bg-[#DA552F]/20 blur-xl rounded-full" />
                        </div>
                        <p className="text-zinc-500 font-mono text-xs animate-pulse">{statusMessage}...</p>
                    </div>
                ) : (
                    <div className="h-64 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center space-y-4 text-center px-6">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-700">
                            <Search className="w-6 h-6" />
                        </div>
                        <div className="max-w-xs">
                            <h3 className="text-white font-bold mb-1">No Data Extracted</h3>
                            <p className="text-zinc-500 text-sm">Select a date and click run to start the grounded extraction process.</p>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
