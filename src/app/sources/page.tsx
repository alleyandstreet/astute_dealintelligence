"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Play,
    Plus,
    X,
    Loader2,
    CheckCircle2,
    Terminal,
    Sparkles,
    Globe,
    MessageSquare,
    TrendingUp,
    Zap,
    Target,
    DollarSign,
    Save,
    FolderOpen,
    Trash2,
    Star,
} from "lucide-react";

interface SavedConfig {
    id: string;
    name: string;
    subreddits: string;
    keywords: string;
    isDefault: boolean;
}

const SUBREDDIT_PACKS = {
    saas: {
        name: "SaaS Pack",
        subreddits: ["SaaS", "microsaas", "EntrepreneurRideAlong", "indiehackers"],
        keywords: ["MRR", "ARR", "churn", "selling", "exit", "revenue"],
        color: "cyan",
    },
    ecommerce: {
        name: "E-commerce Pack",
        subreddits: ["ecommerce", "FulfillmentByAmazon", "shopify", "dropship"],
        keywords: ["selling", "FBA", "revenue", "exit", "Shopify store"],
        color: "amber",
    },
    service: {
        name: "Service Pack",
        subreddits: ["smallbusiness", "sweatystartup", "Entrepreneur", "sidehustle"],
        keywords: ["selling", "exit", "retire", "acquisition", "burned out"],
        color: "green",
    },
};

const SEARCH_STAGES = [
    { icon: Globe, label: "Connecting to Reddit", color: "cyan" },
    { icon: MessageSquare, label: "Fetching Posts", color: "blue" },
    { icon: Search, label: "Analyzing Content", color: "purple" },
    { icon: TrendingUp, label: "Scoring Viability", color: "green" },
    { icon: Target, label: "Finding Matches", color: "amber" },
    { icon: DollarSign, label: "Estimating Valuations", color: "emerald" },
    { icon: Zap, label: "Saving Deals", color: "orange" },
];

interface SearchSlide {
    id: string;
    type: "subreddit" | "keyword" | "match" | "deal";
    content: string;
    detail?: string;
    color: string;
}

export default function SourcesPage() {
    const [subreddits, setSubreddits] = useState<string[]>([]);
    const [keywords, setKeywords] = useState<string[]>([]);
    const [newSubreddit, setNewSubreddit] = useState("");
    const [newKeyword, setNewKeyword] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    const [logs, setLogs] = useState<{ id: string; message: string; type: string }[]>([]);
    const [scanResult, setScanResult] = useState<any>(null);
    const [currentSlide, setCurrentSlide] = useState<SearchSlide | null>(null);
    const [stageIndex, setStageIndex] = useState(0);
    const [slideHistory, setSlideHistory] = useState<SearchSlide[]>([]);
    const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [configName, setConfigName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const logEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchSavedConfigs();
    }, []);

    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs]);

    useEffect(() => {
        if (!isScanning) return;
        const interval = setInterval(() => {
            setStageIndex((prev) => (prev + 1) % SEARCH_STAGES.length);
        }, 2000);
        return () => clearInterval(interval);
    }, [isScanning]);

    const fetchSavedConfigs = async () => {
        try {
            const res = await fetch("/api/search-configs");
            if (res.ok) {
                const data = await res.json();
                setSavedConfigs(data);

                // Load default config if exists
                const defaultConfig = data.find((c: SavedConfig) => c.isDefault);
                if (defaultConfig) {
                    loadConfig(defaultConfig);
                }
            }
        } catch (error) {
            console.error("Failed to fetch saved configs:", error);
        }
    };

    const loadConfig = (config: SavedConfig) => {
        setSubreddits(config.subreddits ? config.subreddits.split(",") : []);
        setKeywords(config.keywords ? config.keywords.split(",") : []);
        toast.success(`Loaded "${config.name}"`);
    };

    const saveConfig = async () => {
        if (!configName.trim() || subreddits.length === 0) {
            toast.error("Name and at least one subreddit required");
            return;
        }
        setIsSaving(true);
        try {
            const res = await fetch("/api/search-configs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: configName,
                    subreddits,
                    keywords,
                }),
            });
            if (res.ok) {
                const config = await res.json();
                setSavedConfigs([config, ...savedConfigs]);
                setShowSaveModal(false);
                setConfigName("");
                toast.success("Configuration saved!");
            }
        } catch (error) {
            toast.error("Failed to save configuration");
        } finally {
            setIsSaving(false);
        }
    };

    const deleteConfig = async (id: string) => {
        try {
            await fetch(`/api/search-configs?id=${id}`, { method: "DELETE" });
            setSavedConfigs(savedConfigs.filter((c) => c.id !== id));
            toast.success("Configuration deleted");
        } catch (error) {
            toast.error("Failed to delete configuration");
        }
    };

    const addPack = (packKey: keyof typeof SUBREDDIT_PACKS) => {
        const pack = SUBREDDIT_PACKS[packKey];
        setSubreddits((prev) => [...new Set([...prev, ...pack.subreddits])]);
        setKeywords((prev) => [...new Set([...prev, ...pack.keywords])]);
        toast.success(`Added ${pack.name}`);
    };

    const addSubreddit = () => {
        if (!newSubreddit.trim()) return;
        const sub = newSubreddit.replace(/^r\//, "").trim();
        if (!subreddits.includes(sub)) {
            setSubreddits([...subreddits, sub]);
        }
        setNewSubreddit("");
    };

    const addKeyword = () => {
        if (!newKeyword.trim()) return;
        if (!keywords.includes(newKeyword.trim())) {
            setKeywords([...keywords, newKeyword.trim()]);
        }
        setNewKeyword("");
    };

    const updateSlide = (slide: SearchSlide) => {
        setCurrentSlide(slide);
        setSlideHistory((prev) => [...prev.slice(-4), slide]);
    };

    const startScan = async () => {
        if (subreddits.length === 0) {
            toast.error("Add at least one subreddit");
            return;
        }

        setIsScanning(true);
        setLogs([{ id: "start", message: "🚀 Initializing scan...", type: "status" }]);
        setScanResult(null);
        setSlideHistory([]);
        setStageIndex(0);

        for (const sub of subreddits) {
            updateSlide({
                id: `sub-${sub}`,
                type: "subreddit",
                content: `r/${sub}`,
                detail: "Queuing subreddit...",
                color: "cyan",
            });
            await new Promise((r) => setTimeout(r, 300));
        }

        try {
            const response = await fetch("/api/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subreddits, keywords }),
            });

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.type === "log" || data.type === "status") {
                                setLogs((prev) => [
                                    ...prev,
                                    { id: Date.now().toString() + Math.random(), message: data.message, type: data.type },
                                ]);

                                if (data.message.includes("Fetching r/")) {
                                    const sub = data.message.match(/r\/(\w+)/)?.[1];
                                    if (sub) {
                                        updateSlide({
                                            id: `fetch-${sub}`,
                                            type: "subreddit",
                                            content: `r/${sub}`,
                                            detail: "Downloading posts...",
                                            color: "blue",
                                        });
                                    }
                                } else if (data.message.includes("Got") && data.message.includes("posts")) {
                                    const match = data.message.match(/Got (\d+) posts from r\/(\w+)/);
                                    if (match) {
                                        updateSlide({
                                            id: `got-${match[2]}`,
                                            type: "subreddit",
                                            content: `r/${match[2]}`,
                                            detail: `Found ${match[1]} posts`,
                                            color: "green",
                                        });
                                    }
                                } else if (data.message.includes("NEW DEAL")) {
                                    const title = data.message.match(/NEW DEAL: "([^"]+)"/)?.[1];
                                    if (title) {
                                        updateSlide({
                                            id: `deal-${Date.now()}`,
                                            type: "deal",
                                            content: title,
                                            detail: "🔥 High-potential deal found!",
                                            color: "amber",
                                        });
                                    }
                                }
                            } else if (data.type === "complete") {
                                setScanResult(data.summary);
                                toast.success(`Found ${data.summary.dealsCreated} new deals!`);
                                updateSlide({
                                    id: "complete",
                                    type: "match",
                                    content: `${data.summary.dealsCreated} Deals Found`,
                                    detail: `Scanned ${data.summary.postsScanned} posts`,
                                    color: "green",
                                });
                            } else if (data.type === "error") {
                                toast.error(data.message);
                            }
                        } catch {
                            // Ignore parse errors
                        }
                    }
                }
            }
        } catch (error) {
            toast.error("Scan failed");
            console.error(error);
        } finally {
            setIsScanning(false);
        }
    };

    const currentStage = SEARCH_STAGES[stageIndex];
    const StageIcon = currentStage.icon;

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Search Configuration</h1>
                    <p className="text-[var(--text-muted)]">
                        Configure subreddits and keywords to discover deals
                    </p>
                </div>
                <div className="flex gap-2">
                    {subreddits.length > 0 && (
                        <button
                            onClick={() => setShowSaveModal(true)}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Save Config
                        </button>
                    )}
                </div>
            </div>

            {/* Saved Configs */}
            {savedConfigs.length > 0 && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <FolderOpen className="w-4 h-4 text-cyan-400" />
                        <h3 className="font-semibold text-white">Saved Configurations</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {savedConfigs.map((config) => (
                            <div
                                key={config.id}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] group"
                            >
                                {config.isDefault && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                                <button
                                    onClick={() => loadConfig(config)}
                                    className="text-sm text-[var(--text)] hover:text-white"
                                >
                                    {config.name}
                                </button>
                                <button
                                    onClick={() => deleteConfig(config.id)}
                                    className="text-[var(--text-dim)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Search Slideshow Visualization */}
            <AnimatePresence>
                {isScanning && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-8"
                    >
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f0f12] to-[#1a1a22] border border-[var(--border)] p-8">
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute inset-0" style={{
                                    backgroundImage: `radial-gradient(circle at 1px 1px, rgba(6, 182, 212, 0.3) 1px, transparent 0)`,
                                    backgroundSize: "40px 40px",
                                }} />
                            </div>

                            <motion.div
                                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-${currentStage.color}-500/20 blur-3xl`}
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.3, 0.5, 0.3],
                                }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />

                            <div className="relative z-10 text-center mb-8">
                                <motion.div
                                    key={stageIndex}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className={`inline-flex items-center gap-3 px-6 py-3 rounded-full bg-${currentStage.color}-500/10 border border-${currentStage.color}-500/30`}
                                >
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    >
                                        <StageIcon className={`w-5 h-5 text-${currentStage.color}-400`} />
                                    </motion.div>
                                    <span className={`font-medium text-${currentStage.color}-400`}>
                                        {currentStage.label}
                                    </span>
                                </motion.div>
                            </div>

                            <div className="relative z-10 flex justify-center mb-8">
                                <AnimatePresence mode="wait">
                                    {currentSlide && (
                                        <motion.div
                                            key={currentSlide.id}
                                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -20, scale: 0.9 }}
                                            transition={{ duration: 0.3 }}
                                            className={`px-8 py-6 rounded-xl bg-${currentSlide.color}-500/10 border border-${currentSlide.color}-500/30 max-w-lg w-full`}
                                        >
                                            <p className={`text-2xl font-bold text-${currentSlide.color}-400 mb-2 truncate`}>
                                                {currentSlide.content}
                                            </p>
                                            {currentSlide.detail && (
                                                <p className="text-[var(--text-muted)]">{currentSlide.detail}</p>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="relative z-10 flex justify-center gap-2">
                                {slideHistory.slice(-5).map((slide, i) => (
                                    <motion.div
                                        key={slide.id}
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 0.5 - i * 0.1, scale: 1 }}
                                        className={`w-2 h-2 rounded-full bg-${slide.color}-400`}
                                    />
                                ))}
                            </div>

                            <div className="relative z-10 mt-6">
                                <div className="h-1 bg-[var(--border)] rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500"
                                        initial={{ width: "0%" }}
                                        animate={{ width: "100%" }}
                                        transition={{ duration: 60, ease: "linear" }}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Subreddits */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
                    <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <Search className="w-5 h-5 text-cyan-400" />
                        Subreddits
                    </h2>

                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newSubreddit}
                            onChange={(e) => setNewSubreddit(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addSubreddit()}
                            placeholder="r/smallbusiness"
                            className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-2 text-white placeholder:text-[var(--text-dim)] focus:border-cyan-500 focus:outline-none"
                        />
                        <button onClick={addSubreddit} className="btn-primary px-4">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2 min-h-[80px]">
                        {subreddits.map((sub) => (
                            <motion.span
                                key={sub}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                            >
                                r/{sub}
                                <button
                                    onClick={() => setSubreddits(subreddits.filter((s) => s !== sub))}
                                    className="hover:text-white"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </motion.span>
                        ))}
                        {subreddits.length === 0 && (
                            <p className="text-[var(--text-dim)] text-sm">No subreddits added</p>
                        )}
                    </div>
                </div>

                {/* Keywords */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
                    <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        Keywords
                    </h2>

                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newKeyword}
                            onChange={(e) => setNewKeyword(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                            placeholder="selling, MRR, exit..."
                            className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-2 text-white placeholder:text-[var(--text-dim)] focus:border-amber-500 focus:outline-none"
                        />
                        <button onClick={addKeyword} className="btn-primary px-4 !bg-amber-500 hover:!bg-amber-600">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2 min-h-[80px]">
                        {keywords.map((kw) => (
                            <motion.span
                                key={kw}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            >
                                {kw}
                                <button
                                    onClick={() => setKeywords(keywords.filter((k) => k !== kw))}
                                    className="hover:text-white"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </motion.span>
                        ))}
                        {keywords.length === 0 && (
                            <p className="text-[var(--text-dim)] text-sm">No keywords added</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Add Packs */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 mb-8">
                <h2 className="font-semibold text-white mb-4">Quick Add Packs</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(SUBREDDIT_PACKS).map(([key, pack]) => (
                        <motion.button
                            key={key}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => addPack(key as keyof typeof SUBREDDIT_PACKS)}
                            className={`p-4 rounded-xl bg-${pack.color}-500/5 border border-${pack.color}-500/20 hover:bg-${pack.color}-500/10 transition-all text-left`}
                        >
                            <h3 className={`font-semibold text-${pack.color}-400 mb-2`}>{pack.name}</h3>
                            <p className="text-xs text-[var(--text-muted)]">
                                {pack.subreddits.map((s) => `r/${s}`).join(", ")}
                            </p>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Start Scan Button */}
            <div className="flex justify-center mb-8">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={startScan}
                    disabled={isScanning || subreddits.length === 0}
                    className="btn-primary px-8 py-4 text-lg flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isScanning ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Scanning...
                        </>
                    ) : (
                        <>
                            <Play className="w-5 h-5" />
                            Start Search
                        </>
                    )}
                </motion.button>
            </div>

            {/* Scan Logs */}
            {logs.length > 0 && !isScanning && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden"
                >
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
                        <Terminal className="w-4 h-4 text-[var(--text-muted)]" />
                        <span className="font-medium text-white">Scan Complete</span>
                        {scanResult && (
                            <span className="ml-auto flex items-center gap-2 text-green-400 text-sm">
                                <CheckCircle2 className="w-4 h-4" />
                                {scanResult.dealsCreated} deals found
                            </span>
                        )}
                    </div>
                    <div className="h-48 overflow-y-auto p-4 bg-[#09090b] font-mono text-xs space-y-1">
                        {logs.map((log) => (
                            <div
                                key={log.id}
                                className={
                                    log.type === "status"
                                        ? "text-cyan-400"
                                        : log.message.includes("❌")
                                            ? "text-red-400"
                                            : log.message.includes("✅") || log.message.includes("🔥")
                                                ? "text-green-400"
                                                : "text-[var(--text-muted)]"
                                }
                            >
                                {log.message}
                            </div>
                        ))}
                        <div ref={logEndRef} />
                    </div>
                </motion.div>
            )}

            {/* Save Config Modal */}
            <AnimatePresence>
                {showSaveModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowSaveModal(false)}
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md z-50"
                        >
                            <h3 className="text-xl font-semibold text-white mb-4">Save Configuration</h3>
                            <input
                                type="text"
                                value={configName}
                                onChange={(e) => setConfigName(e.target.value)}
                                placeholder="Configuration name..."
                                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 text-white placeholder:text-[var(--text-dim)] focus:border-cyan-500 focus:outline-none mb-4"
                            />
                            <div className="text-sm text-[var(--text-muted)] mb-4">
                                <p>{subreddits.length} subreddits, {keywords.length} keywords</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowSaveModal(false)}
                                    className="flex-1 btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveConfig}
                                    disabled={isSaving || !configName.trim()}
                                    className="flex-1 btn-primary flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
