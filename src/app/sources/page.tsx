"use client";

import { useState, useRef, useEffect, Suspense, useMemo } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
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
    Star,
} from "lucide-react";
import Link from "next/link";
import { useScraper } from "@/components/ScraperProvider";

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

const TOPIC_PACKS = {
    saas: {
        name: "SaaS Topics",
        items: ["saas", "developer-tools", "productivity", "marketing"],
        keywords: ["MRR", "ARR", "revenue", "scale"],
        color: "cyan",
    },
    ai: {
        name: "AI & Data",
        items: ["artificial-intelligence", "data-analytics", "machine-learning"],
        keywords: ["AI", "generative results", "automation"],
        color: "amber",
    },
    growth: {
        name: "Growth & Sales",
        items: ["sales", "growth-hacking", "marketing"],
        keywords: ["growth", "sales", "leads"],
        color: "green",
    },
};

const INDIEHUSTLE_PACKS = {
    startups: {
        name: "Startup Deals",
        items: ["saas", "marketplace", "tools"],
        keywords: ["revenue", "selling", "exit", "acquisition"],
        color: "purple",
    },
    content: {
        name: "Content Businesses",
        items: ["newsletter", "content", "media"],
        keywords: ["subscribers", "revenue", "monetization"],
        color: "rose",
    },
    services: {
        name: "Service Businesses",
        items: ["agency", "consulting", "services"],
        keywords: ["clients", "revenue", "selling"],
        color: "indigo",
    },
};

const INDIEHACKERS_PACKS = {
    growth: {
        name: "Growth Sagas",
        items: ["marketing", "seo", "growth", "sales"],
        keywords: ["mrr", "users", "content"],
        color: "pink",
    },
    milestones: {
        name: "Milestones",
        items: ["revenue", "mrr", "acquired", "exit"],
        keywords: ["milestone", "celebration", "money"],
        color: "green",
    },
    tech: {
        name: "No-Code / Tech",
        items: ["nocode", "bubble", "nextjs", "stack"],
        keywords: ["build", "ship", "mvp"],
        color: "purple",
    },
};

const colorStyles: Record<string, { bg: string, border: string, text: string, hover: string }> = {
    cyan: { bg: "bg-cyan-500/5", border: "border-cyan-500/20", text: "text-cyan-400", hover: "hover:bg-cyan-500/10" },
    amber: { bg: "bg-amber-500/5", border: "border-amber-500/20", text: "text-amber-400", hover: "hover:bg-amber-500/10" },
    green: { bg: "bg-green-500/5", border: "border-green-500/20", text: "text-green-400", hover: "hover:bg-green-500/10" },
    purple: { bg: "bg-purple-500/5", border: "border-purple-500/20", text: "text-purple-400", hover: "hover:bg-purple-500/10" },
    rose: { bg: "bg-rose-500/5", border: "border-rose-500/20", text: "text-rose-400", hover: "hover:bg-rose-500/10" },
    indigo: { bg: "bg-indigo-500/5", border: "border-indigo-500/20", text: "text-indigo-400", hover: "hover:bg-indigo-500/10" },
    emerald: { bg: "bg-emerald-500/5", border: "border-emerald-500/20", text: "text-emerald-400", hover: "hover:bg-emerald-500/10" },
    orange: { bg: "bg-orange-500/5", border: "border-orange-500/20", text: "text-orange-400", hover: "hover:bg-orange-500/10" },
    blue: { bg: "bg-blue-500/5", border: "border-blue-500/20", text: "text-blue-400", hover: "hover:bg-blue-500/10" },
    pink: { bg: "bg-pink-500/5", border: "border-pink-500/20", text: "text-pink-400", hover: "hover:bg-pink-500/10" },
    red: { bg: "bg-red-500/5", border: "border-red-500/20", text: "text-red-400", hover: "hover:bg-red-500/10" },
};

const getSearchStages = (platform: string) => {
    const platformName = {
        reddit: "Reddit",
        producthunt: "ProductHunt",
        indiehustle: "IndieHustle",
        indiehackers: "IndieHackers",
    }[platform] || "Platform";

    const fetchLabel = {
        reddit: "Fetching Posts",
        producthunt: "Fetching Products",
        indiehustle: "Fetching Articles",
        indiehackers: "Fetching Feed",
    }[platform] || "Fetching Content";

    return [
        { icon: Globe, label: `Connecting to ${platformName}`, color: "cyan" },
        { icon: MessageSquare, label: fetchLabel, color: "blue" },
        { icon: Search, label: "Analyzing Content", color: "purple" },
        { icon: TrendingUp, label: "Scoring Viability", color: "green" },
        { icon: Target, label: "Finding Matches", color: "amber" },
        { icon: DollarSign, label: "Estimating Valuations", color: "emerald" },
        { icon: Zap, label: "Saving Deals", color: "orange" },
    ];
};

interface SearchSlide {
    id: string;
    type: "subreddit" | "keyword" | "match" | "deal";
    content: string;
    detail?: string;
    color: string;
}

function SourcesContent() {
    const searchParams = useSearchParams();
    const sourceParam = searchParams.get("source");
    const platform = (sourceParam || "reddit") as string;

    const { activeJobs, jobs, startScan } = useScraper();

    const [subreddits, setSubreddits] = useState<string[]>([]);
    const [keywords, setKeywords] = useState<string[]>([]);
    const [newSubreddit, setNewSubreddit] = useState("");
    const [newKeyword, setNewKeyword] = useState("");
    const [minRevenue, setMinRevenue] = useState("");
    const [scanIntensity, setScanIntensity] = useState<"1x" | "2x" | "4x" | "until30">("1x");

    // Local UI state for visualization
    const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [configName, setConfigName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const logEndRef = useRef<HTMLDivElement>(null);

    // Derived job state
    const currentJob = useMemo(() => {
        return activeJobs.find(j => j.platform === platform) || 
               jobs.filter(j => j.platform === platform).sort((a,b) => b.createdAt - a.createdAt)[0];
    }, [activeJobs, jobs, platform]);

    const isScanning = currentJob?.status === "running" || currentJob?.status === "pending";

    // Visualization stuff
    const [stageIndex, setStageIndex] = useState(0);
    const [currentSlide, setCurrentSlide] = useState<SearchSlide | null>(null);
    const [slideHistory, setSlideHistory] = useState<SearchSlide[]>([]);

    useEffect(() => {
        if (!isScanning) return;
        const interval = setInterval(() => {
            setStageIndex((prev) => (prev + 1) % getSearchStages(platform).length);
        }, 2000);
        return () => clearInterval(interval);
    }, [isScanning, platform]);

    // Handle slide updates based on logs
    useEffect(() => {
        if (!currentJob?.logs) return;
        const lastLog = currentJob.logs[currentJob.logs.length - 1];
        if (!lastLog) return;

        if (lastLog.message.includes("Fetching r/")) {
            const sub = lastLog.message.match(/r\/(\w+)/)?.[1];
            if (sub) {
                const id = `fetch-${sub}`;
                if (currentSlide?.id !== id) {
                    const slide: SearchSlide = { id, type: "subreddit", content: `r/${sub}`, detail: "Downloading posts...", color: "blue" };
                    setCurrentSlide(slide);
                    setSlideHistory(prev => [...prev.slice(-4), slide]);
                }
            }
        } else if (lastLog.message.includes("NEW DEAL")) {
            const title = lastLog.message.match(/NEW DEAL: "([^"]+)"/)?.[1];
            if (title) {
                const id = `deal-${Date.now()}`;
                const slide: SearchSlide = { id, type: "deal", content: title, detail: "🔥 High-potential deal found!", color: "amber" };
                setCurrentSlide(slide);
                setSlideHistory(prev => [...prev.slice(-4), slide]);
            }
        }
    }, [currentJob?.logs, currentSlide?.id]);

    useEffect(() => {
        fetchSavedConfigs();
    }, []);

    useEffect(() => {
        if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }, [currentJob?.logs]);

    const fetchSavedConfigs = async () => {
        try {
            const res = await fetch("/api/search-configs");
            if (res.ok) {
                const data = await res.json();
                setSavedConfigs(data);
                const defaultConfig = data.find((c: SavedConfig) => c.isDefault);
                if (defaultConfig) loadConfig(defaultConfig);
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

    const handleStartScan = async () => {
        if (subreddits.length === 0 && platform !== 'indiehackers') {
            toast.error("Add at least one source");
            return;
        }

        const intensityConfig = {
            "1x": { repeatCount: 1, targetDeals: undefined },
            "2x": { repeatCount: 2, targetDeals: undefined },
            "4x": { repeatCount: 4, targetDeals: undefined },
            "until30": { repeatCount: 10, targetDeals: 30 },
        }[scanIntensity];

        const jobId = await startScan(platform, {
            subreddits,
            keywords,
            minRevenue,
            maxItemsPerPlatform: 20,
            repeatCount: intensityConfig.repeatCount,
            targetDeals: intensityConfig.targetDeals,
        });

        if (jobId) {
            setSlideHistory([]);
            setStageIndex(0);
        }
    };

    const addPack = (key: string) => {
        let pack: any;
        if (platform === "reddit") pack = SUBREDDIT_PACKS[key as keyof typeof SUBREDDIT_PACKS];
        else if (platform === "producthunt") pack = TOPIC_PACKS[key as keyof typeof TOPIC_PACKS];
        else if (platform === "indiehustle") pack = INDIEHUSTLE_PACKS[key as keyof typeof INDIEHUSTLE_PACKS];
        else if (platform === "indiehackers") pack = INDIEHACKERS_PACKS[key as keyof typeof INDIEHACKERS_PACKS];

        if (pack) {
            setSubreddits((prev) => [...new Set([...prev, ...(pack.subreddits || pack.items)])]);
            setKeywords((prev) => [...new Set([...prev, ...(pack.keywords || [])])]);
            toast.success(`Added ${pack.name}`);
        }
    };

    const addSubreddit = () => {
        if (!newSubreddit.trim()) return;
        const sub = newSubreddit.replace(/^r\//, "").trim();
        if (!subreddits.includes(sub)) setSubreddits([...subreddits, sub]);
        setNewSubreddit("");
    };

    const addKeyword = () => {
        if (!newKeyword.trim()) return;
        if (!keywords.includes(newKeyword.trim())) setKeywords([...keywords, newKeyword.trim()]);
        setNewKeyword("");
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

    const saveConfig = async () => {
        if (!configName.trim() || subreddits.length === 0) {
            toast.error("Name and at least one source required");
            return;
        }
        setIsSaving(true);
        try {
            const res = await fetch("/api/search-configs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: configName, subreddits, keywords }),
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

    const currentStage = getSearchStages(platform)[stageIndex];
    const StageIcon = currentStage.icon;

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Search Configuration</h1>
                    <p className="text-[var(--text-muted)]">
                        {platform === "reddit"
                            ? "Configure subreddits and keywords to discover deals"
                            : platform === "producthunt"
                                ? "Configure topics to discover ProductHunt opportunities"
                                : `Configure settings to discover deals on ${platform === 'indiehackers' ? 'Indie Hackers' : 'IndieHustle'}`}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link
                        href="/sources/producthunt-grounded"
                        className="btn-primary !bg-[#DA552F] hover:!bg-[#bf4a29] flex items-center gap-2 px-4 shadow-lg shadow-[#DA552F]/20"
                    >
                        <Zap className="w-4 h-4" />
                        PH Grounded Scraper
                    </Link>
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

            {/* Search Visualization */}
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
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
                    <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <Search className="w-5 h-5 text-cyan-400" />
                        {platform === "reddit" ? "Subreddits" : "Config / Tags"}
                    </h2>
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newSubreddit}
                            onChange={(e) => setNewSubreddit(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addSubreddit()}
                            placeholder="Add source..."
                            className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-2 text-white placeholder:text-[var(--text-dim)] focus:border-cyan-500 focus:outline-none"
                        />
                        <button onClick={addSubreddit} className="btn-primary px-4"><Plus className="w-4 h-4" /></button>
                    </div>
                    <div className="flex flex-wrap gap-2 min-h-[80px]">
                        {subreddits.map((sub) => (
                            <motion.span key={sub} className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                {platform === "reddit" ? "r/" : ""}{sub}
                                <button onClick={() => setSubreddits(subreddits.filter((s) => s !== sub))}><X className="w-3 h-3" /></button>
                            </motion.span>
                        ))}
                    </div>
                </div>

                {platform === "reddit" && (
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
                        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-400" /> Keywords
                        </h2>
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={newKeyword}
                                onChange={(e) => setNewKeyword(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                                placeholder="Keywords..."
                                className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-2 text-white placeholder:text-[var(--text-dim)] focus:border-amber-500 focus:outline-none"
                            />
                            <button onClick={addKeyword} className="btn-primary px-4 !bg-amber-500"><Plus className="w-4 h-4" /></button>
                        </div>
                        <div className="flex flex-wrap gap-2 min-h-[80px]">
                            {keywords.map((kw) => (
                                <motion.span key={kw} className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    {kw}<button onClick={() => setKeywords(keywords.filter((k) => k !== kw))}><X className="w-3 h-3" /></button>
                                </motion.span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 mb-8">
                <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-400" /> Revenue Filter
                </h2>
                <div className="flex gap-4">
                    <input
                        type="number"
                        value={minRevenue}
                        onChange={(e) => setMinRevenue(e.target.value)}
                        placeholder="Min revenue..."
                        className="max-w-xs bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-2 text-white"
                    />
                    <p className="text-xs text-[var(--text-dim)] mt-2">Filter out lower value deals.</p>
                </div>
            </div>

            {/* Quick Packs */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 mb-8">
                <h2 className="font-semibold text-white mb-4">Quick Add Packs</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(platform === "reddit"
                        ? Object.entries(SUBREDDIT_PACKS)
                        : platform === "producthunt"
                            ? Object.entries(TOPIC_PACKS)
                            : platform === "indiehustle"
                                ? Object.entries(INDIEHUSTLE_PACKS)
                                : Object.entries(INDIEHACKERS_PACKS)
                    ).map(([key, pack]) => {
                        const styles = colorStyles[pack.color] || colorStyles.cyan;
                        return (
                            <button key={key} onClick={() => addPack(key)} className={`p-4 rounded-xl ${styles.bg} border ${styles.border} text-left`}>
                                <h3 className={`font-semibold ${styles.text} mb-2`}>{pack.name}</h3>
                                <p className="text-xs text-[var(--text-muted)]">{(pack as any).subreddits?.join(", ") || (pack as any).items?.join(", ")}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Scan Intensity */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 mb-8">
                <h2 className="font-semibold text-white mb-2">Scan Intensity</h2>
                <p className="text-xs text-[var(--text-dim)] mb-4">Run multiple passes to discover more deals. Each pass fetches a fresh batch of listings.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { id: "1x" as const, label: "1× Quick", desc: "Single pass", color: "cyan" },
                        { id: "2x" as const, label: "2× Standard", desc: "Two passes", color: "blue" },
                        { id: "4x" as const, label: "4× Deep", desc: "Four passes", color: "purple" },
                        { id: "until30" as const, label: "Until 30 Deals", desc: "Auto-repeat", color: "amber" },
                    ].map((opt) => {
                        const isActive = scanIntensity === opt.id;
                        const styles = colorStyles[opt.color] || colorStyles.cyan;
                        return (
                            <button
                                key={opt.id}
                                onClick={() => setScanIntensity(opt.id)}
                                className={`p-4 rounded-xl border text-left transition-all ${
                                    isActive
                                        ? `${styles.bg} ${styles.border} ring-1 ring-${opt.color}-500/40`
                                        : "border-[var(--border)] hover:border-white/20"
                                }`}
                            >
                                <h3 className={`font-semibold text-sm ${isActive ? styles.text : "text-white"}`}>{opt.label}</h3>
                                <p className="text-xs text-[var(--text-dim)] mt-1">{opt.desc}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Start button */}
            <div className="flex justify-center mb-8">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleStartScan}
                    disabled={isScanning}
                    className="btn-primary px-8 py-4 text-lg flex items-center gap-3 disabled:opacity-50"
                >
                    {isScanning ? <><Loader2 className="w-5 h-5 animate-spin" /> Scanning Platform...</> : <><Play className="w-5 h-5" /> Start Search</>}
                </motion.button>
            </div>

            {/* Logs from currentJob */}
            {currentJob?.logs && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
                        <Terminal className="w-4 h-4 text-[var(--text-muted)]" />
                        <span className="font-medium text-white">Platform Scan: {currentJob.platform} ({currentJob.status})</span>
                    </div>
                    <div className="h-48 overflow-y-auto p-4 bg-[#09090b] font-mono text-xs space-y-1">
                        {currentJob.logs.map((log, idx) => (
                            <div key={idx} className={log.type === "status" ? "text-cyan-400" : log.type === "error" ? "text-red-400" : "text-[var(--text-muted)]"}>
                                {log.message}
                            </div>
                        ))}
                        <div ref={logEndRef} />
                    </div>
                </motion.div>
            )}

            {/* Modal remains simplified */}
            <AnimatePresence>
                {showSaveModal && (
                    <div className="fixed inset-0 flex items-center justify-center z-50">
                        <div className="absolute inset-0 bg-black/70" onClick={() => setShowSaveModal(false)} />
                        <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md">
                            <h3 className="text-xl font-semibold text-white mb-4">Save Configuration</h3>
                            <input type="text" value={configName} onChange={(e) => setConfigName(e.target.value)} placeholder="Name..." className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 text-white mb-4" />
                            <div className="flex gap-3">
                                <button onClick={() => setShowSaveModal(false)} className="flex-1 btn-secondary">Cancel</button>
                                <button onClick={saveConfig} disabled={isSaving} className="flex-1 btn-primary">Save</button>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function SourcesPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>}>
            <SourcesContent />
        </Suspense>
    );
}
