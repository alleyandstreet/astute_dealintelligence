"use client";

import React, { useState, useRef } from "react";
import {
    Sparkles,
    RefreshCw,
    AtSign,
    Facebook,
    Instagram,
    Linkedin,
    Twitter,
    CheckCircle2,
    MoreHorizontal,
    Video,
    CalendarClock,
    ArrowRight,
    ArrowLeft,
    Search,
    BrainCircuit,
    Wand2,
    Copy,
    Image as ImageIcon,
    Plus,
    X,
    Layout,
    Trash2,
    LayoutGrid,
    Upload,
    Film
} from "lucide-react";
import { QuickPostActionCenter } from "@/components/QuickPostActionCenter";
import Link from "next/link";
import { Toaster, toast } from "sonner";
import { useRouter } from "next/navigation";
import DateTimePicker from "@/components/DateTimePicker";
import { useContentState } from "@/components/ContentStateProvider";
import { useEffect } from "react";
import SocialPreview from "@/components/SocialPreview";

export default function InstagramGenerator() {
    // State
    const router = useRouter();
    const { generatorState, setGeneratorState, resetGenerator } = useContentState();

    const [step, setStep] = useState<1 | 2>(generatorState.step);
    const [input, setInput] = useState(generatorState.input);
    const [loading, setLoading] = useState(false);
    const [regeneratingId, setRegeneratingId] = useState<{ tab: string, index: number } | null>(null);
    const [variations, setVariations] = useState(generatorState.variations);
    const [activeTab, setActiveTab] = useState(generatorState.activeTab);
    const [persona, setPersona] = useState(generatorState.persona);
    const [selectedCaption, setSelectedCaption] = useState(generatorState.selectedCaption);
    const [mediaFiles, setMediaFiles] = useState<File[]>(generatorState.mediaFiles);
    const [isListening, setIsListening] = useState(false);
    const [scheduledDate, setScheduledDate] = useState<Date | null>(generatorState.scheduledDate);
    const [imagePrompt, setImagePrompt] = useState<string>("");
    const [showReminders, setShowReminders] = useState(false);
    const [generatingPrompt, setGeneratingPrompt] = useState(false);
    const [selectedHashtags, setSelectedHashtags] = useState<Record<string, string[]>>({});

    // Sync to global state
    useEffect(() => {
        setGeneratorState({
            input,
            persona,
            variations,
            activeTab,
            selectedCaption,
            scheduledDate,
            mediaFiles,
            step
        });
    }, [input, persona, variations, activeTab, selectedCaption, scheduledDate, mediaFiles, step, setGeneratorState]);

    const handleReset = () => {
        if (confirm("Clear all generated content and start over?")) {
            resetGenerator();
            setStep(1);
            setInput("");
            setVariations({ instagram: [], linkedin: [], twitter: [], threads: [], facebook: [] });
            setActiveTab('instagram');
            setPersona("Professional");
            setSelectedCaption(null);
            setMediaFiles([]);
            setScheduledDate(null);
            setSelectedHashtags({});
            toast.success("Generator reset");
        }
    };

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handlers
    const handleGenerate = async () => {
        if (!input.trim()) return;

        setLoading(true);
        setVariations({ instagram: [], linkedin: [], twitter: [], threads: [], facebook: [] }); // Clear previous

        try {
            const res = await fetch("/api/instagram/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic: input, persona })
            });

            const data = await res.json();

            if (data.instagram || data.linkedin || data.twitter || data.threads || data.facebook) {
                setVariations({
                    instagram: data.instagram || [],
                    linkedin: data.linkedin || [],
                    twitter: data.twitter || [],
                    threads: data.threads || [],
                    facebook: data.facebook || []
                });

                // Initialize selected hashtags
                const initialSelected: Record<string, string[]> = {};
                ['instagram', 'linkedin', 'twitter', 'threads', 'facebook'].forEach(p => {
                    (data[p] || []).forEach((v: any, idx: number) => {
                        const allTags = typeof v.hashtags === 'object' && !Array.isArray(v.hashtags)
                            ? [...Object.values(v.hashtags)].flat()
                            : (Array.isArray(v.hashtags) ? v.hashtags : []);
                        initialSelected[`${p}-${idx}`] = allTags;
                    });
                });
                setSelectedHashtags(initialSelected);

                toast.success(`Generated content for all 5 platforms!`);
            } else if (data.variations) {
                // Fallback
                const fallback = data.variations;
                setVariations({
                    instagram: fallback,
                    linkedin: fallback,
                    twitter: fallback,
                    threads: fallback,
                    facebook: fallback
                });
            } else if (data.error) {
                toast.error(`Error: ${data.error}`);
            } else {
                toast.error("Unknown API Error");
            }
        } catch (e) {
            console.error(e);
            toast.error("Network or parse error");
        } finally {
            setLoading(false);
        }
    };

    const toggleHashtag = (platform: string, variationIndex: number, tag: string) => {
        const key = `${platform}-${variationIndex}`;
        setSelectedHashtags(prev => {
            const current = prev[key] || [];
            if (current.includes(tag)) {
                return { ...prev, [key]: current.filter(t => t !== tag) };
            } else {
                return { ...prev, [key]: [...current, tag] };
            }
        });
    };


    const handleRegenerate = async (platform: string, index: number, currentVariation: any) => {
        if (!currentVariation?.title) {
            toast.error("Cannot regenerate: variation title missing");
            return;
        }

        setRegeneratingId({ tab: platform, index });
        try {
            const res = await fetch("/api/instagram/regenerate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic: input,
                    platform: platform,
                    style: currentVariation.title,
                    currentCaption: currentVariation.caption || ""
                })
            });

            const data = await res.json();

            if (data.variation) {
                setVariations(prev => ({
                    ...prev,
                    [platform as keyof typeof prev]: prev[platform as keyof typeof prev].map((item, i) =>
                        i === index ? data.variation : item
                    )
                }));

                // Update selected hashtags for this variation
                const v = data.variation;
                const allTags = typeof v.hashtags === 'object' && !Array.isArray(v.hashtags)
                    ? [...Object.values(v.hashtags)].flat()
                    : (Array.isArray(v.hashtags) ? v.hashtags : []);
                setSelectedHashtags(prev => ({
                    ...prev,
                    [`${platform}-${index}`]: allTags
                }));

                toast.success("Variation regenerated!");
            } else {
                toast.error("Failed to regenerate");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error regenerating");
        } finally {
            setRegeneratingId(null);
        }
    };
    const handleSelectCaption = (variation: any, platform: string, index: number) => {
        const key = `${platform}-${index}`;
        const hashtags = selectedHashtags[key] || [];

        setSelectedCaption({
            caption: variation.caption,
            hashtags: hashtags
        });
        setStep(2);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setMediaFiles(prev => [...prev, ...newFiles]);
            toast.success(`Added ${newFiles.length} file(s)`);
        }
    };

    const removeFile = (index: number) => {
        setMediaFiles(prev => prev.filter((_, i) => i !== index));
    };

    const copyFinalCaption = () => {
        if (!selectedCaption) return;

        let hashtagString = "";
        if (typeof selectedCaption.hashtags === 'string') {
            hashtagString = selectedCaption.hashtags;
        } else if (Array.isArray(selectedCaption.hashtags)) {
            hashtagString = selectedCaption.hashtags.join(' ');
        } else {
            // New cluster format
            const clusters = selectedCaption.hashtags;
            hashtagString = [
                ...(clusters.niche || []),
                ...(clusters.broad || []),
                ...(clusters.highEngagement || [])
            ].join(' ');
        }

        const text = `${selectedCaption.caption}\n\n${hashtagString}`;
        navigator.clipboard.writeText(text);
        toast.success("Full caption copied to clipboard!");
    };

    const handleSchedule = async () => {
        if (!selectedCaption || !scheduledDate) return;

        setLoading(true);
        try {
            // 1. Upload Files
            const uploadedUrls: string[] = [];

            for (const file of mediaFiles) {
                const formData = new FormData();
                formData.append("file", file);

                const uploadRes = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });

                if (!uploadRes.ok) throw new Error("File upload failed");
                const uploadData = await uploadRes.json();
                uploadedUrls.push(uploadData.url);
            }

            // 2. Create Scheduled Post
            const res = await fetch("/api/instagram/schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    caption: selectedCaption.caption,
                    hashtags: typeof selectedCaption.hashtags === 'object' && !Array.isArray(selectedCaption.hashtags)
                        ? [...Object.values(selectedCaption.hashtags)].flat()
                        : typeof selectedCaption.hashtags === 'string'
                            ? selectedCaption.hashtags.split(' ')
                            : selectedCaption.hashtags,
                    scheduledFor: scheduledDate.toISOString(),
                    mediaFiles: uploadedUrls, // Sending real URLs now
                    platform: activeTab,
                    reminderEnabled: showReminders
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success("Content pushed to calendar!");
                setTimeout(() => {
                    setStep(1);
                    setMediaFiles([]);
                    setScheduledDate(null);
                    router.push("/calendar"); // Redirect to calendar to see it
                }, 1500);
            } else {
                toast.error(data.error || "Failed to schedule");
            }
        } catch (error) {
            console.error(error);
            toast.error("Upload or network error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12">
            <Toaster position="top-right" theme="dark" />

            <div className="max-w-6xl mx-auto space-y-12">

                {/* Header */}
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="inline-flex items-center text-zinc-500 hover:text-white transition-colors">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Hub
                        </Link>
                        {step === 2 && (
                            <button
                                onClick={() => setStep(1)}
                                className="text-zinc-500 hover:text-white text-sm transition-colors"
                            >
                                Back to Generation
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 opacity-50">
                            <div className="p-2 bg-gradient-to-br from-pink-500 to-red-500 rounded-lg">
                                <Instagram className="w-4 h-4 text-white" />
                            </div>
                            <div className="p-2 bg-[#0077b5] rounded-lg">
                                <Linkedin className="w-4 h-4 text-white" />
                            </div>
                            <div className="p-2 bg-black rounded-lg">
                                <Twitter className="w-4 h-4 text-white" />
                            </div>
                            <div className="p-2 bg-zinc-800 rounded-lg">
                                <AtSign className="w-4 h-4 text-white" />
                            </div>
                            <div className="p-2 bg-[#1877F2] rounded-lg">
                                <Facebook className="w-4 h-4 text-white" />
                            </div>
                            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold bg-white text-transparent bg-clip-text w-fit tracking-tight pb-2">
                            Content Engine
                        </h1>
                        <p className="text-zinc-400 max-w-xl text-lg leading-relaxed">
                            {step === 1
                                ? "Transform messy thoughts into viral narratives. From idea to caption to publishing, one stop."
                                : "Fine-tune your caption and attach media assets. Get everything ready for posting."
                            }
                        </p>
                    </div>
                </div>

                {/* STEP 1: GENERATION */}
                {step === 1 && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-left-4 duration-500">
                        {/* Input Section */}
                        <div className="bg-[#111] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-6">
                            {/* Persona Selector */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Brand Voice Persona</label>
                                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 gap-1">
                                        {["Professional", "Witty", "Storyteller", "Bold"].map((p) => (
                                            <button
                                                key={p}
                                                onClick={() => setPersona(p)}
                                                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${persona === p
                                                    ? "bg-white text-black shadow-lg"
                                                    : "text-zinc-500 hover:text-zinc-300"
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="relative">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Example: Launched a new coffee shop today. It was crazy. Sold out of croissants. The team worked so hard. I am tired but happy. We need to hire more people..."
                                    className="w-full h-40 bg-black/50 border border-white/10 rounded-xl p-4 text-lg text-white resize-none focus:outline-none focus:ring-1 focus:ring-pink-500/50 transition-all font-mono pr-14"
                                />
                                <button
                                    onClick={() => {
                                        if (isListening) {
                                            (window as any)._recognition?.stop();
                                            setIsListening(false);
                                            return;
                                        }

                                        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                                        if (!SpeechRecognition) {
                                            toast.error("Speech recognition not supported in this browser.");
                                            return;
                                        }

                                        const recognition = new SpeechRecognition();
                                        recognition.continuous = true;
                                        recognition.interimResults = true;
                                        recognition.lang = 'en-US';

                                        recognition.onstart = () => setIsListening(true);
                                        recognition.onresult = (event: any) => {
                                            const transcript = Array.from(event.results)
                                                .map((result: any) => result[0])
                                                .map((result: any) => result.transcript)
                                                .join('');
                                            setInput(transcript);
                                        };
                                        recognition.onerror = (event: any) => {
                                            console.error(event.error);
                                            setIsListening(false);
                                        };
                                        recognition.onend = () => setIsListening(false);

                                        (window as any)._recognition = recognition;
                                        recognition.start();
                                    }}
                                    className={`absolute bottom-4 right-4 p-3 rounded-full transition-all ${isListening
                                        ? "bg-red-500 text-white animate-pulse"
                                        : "bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10"
                                        }`}
                                    title={isListening ? "Stop Listening" : "Voice to Engine"}
                                >
                                    {isListening ? (
                                        <X className="w-5 h-5" />
                                    ) : (
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
                                    )}
                                </button>
                            </div>

                            <div className="mt-4 flex justify-end gap-3">
                                {(input || variations.instagram.length > 0) && (
                                    <button
                                        onClick={handleReset}
                                        className="h-12 w-12 flex items-center justify-center rounded-xl bg-zinc-900 border border-white/5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
                                        title="Clear All"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                                <button
                                    onClick={handleGenerate}
                                    disabled={loading || !input.trim()}
                                    className="relative min-w-[220px] h-12 bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-500 hover:to-red-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-lg shadow-pink-900/20"
                                >
                                    <div className={`absolute inset-0 flex items-center justify-center gap-2 transition-all duration-300 ${loading ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'}`}>
                                        <Sparkles className="w-5 h-5" />
                                        <span>Generate Variations</span>
                                    </div>

                                    <div className={`absolute inset-0 flex items-center justify-center gap-2 transition-all duration-300 ${loading ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}>
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                        <span>Designing...</span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Results Grid */}
                        {/* Results Grid */}
                        {(loading || variations.instagram.length > 0) && (
                            <div className="space-y-6">
                                {/* Tab Switcher - Scrollable for mobile */}
                                {!loading && variations.instagram.length > 0 && (
                                    <div className="flex justify-center w-full overflow-x-auto pb-2 no-scrollbar">
                                        <div className="bg-[#111] p-1 rounded-xl border border-white/5 flex gap-1 min-w-max">
                                            {[
                                                { id: 'instagram', icon: Instagram, label: 'Instagram', color: 'bg-pink-600', shadow: 'shadow-pink-900/20' },
                                                { id: 'linkedin', icon: Linkedin, label: 'LinkedIn', color: 'bg-blue-600', shadow: 'shadow-blue-900/20' },
                                                { id: 'twitter', icon: Twitter, label: 'Twitter', color: 'bg-sky-500', shadow: 'shadow-sky-900/20' },
                                                { id: 'threads', icon: AtSign, label: 'Threads', color: 'bg-zinc-700', shadow: 'shadow-zinc-900/20' },
                                                { id: 'facebook', icon: Facebook, label: 'Facebook', color: 'bg-blue-700', shadow: 'shadow-blue-900/20' },
                                            ].map((tab) => (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setActiveTab(tab.id as any)}
                                                    className={`px-4 md:px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === tab.id
                                                        ? `${tab.color} text-white shadow-lg ${tab.shadow}`
                                                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <tab.icon className="w-4 h-4" /> {tab.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {loading ? (
                                        // SKELETON LOADERS
                                        Array(4).fill(0).map((_, i) => (
                                            <div key={i} className="bg-[#111] border border-white/5 rounded-2xl p-6 flex flex-col relative animate-pulse">
                                                {/* Header Skeleton */}
                                                <div className="flex items-center gap-2 mb-6">
                                                    <div className="w-4 h-4 bg-white/10 rounded-full" />
                                                    <div className="h-4 w-24 bg-white/10 rounded" />
                                                </div>

                                                {/* Body Skeleton - Multiple lines */}
                                                <div className="space-y-3 mb-8 flex-1">
                                                    <div className="h-3 w-full bg-white/5 rounded" />
                                                    <div className="h-3 w-[90%] bg-white/5 rounded" />
                                                    <div className="h-3 w-[85%] bg-white/5 rounded" />
                                                    <div className="h-3 w-full bg-white/5 rounded" />
                                                    <div className="h-3 w-[60%] bg-white/5 rounded" />
                                                </div>

                                                {/* Hashtags Skeleton */}
                                                <div className="flex flex-wrap gap-2 mb-8">
                                                    <div className="h-5 w-16 bg-white/10 rounded-full" />
                                                    <div className="h-5 w-20 bg-white/10 rounded-full" />
                                                    <div className="h-5 w-12 bg-white/10 rounded-full" />
                                                </div>

                                                {/* Buttons Skeleton */}
                                                <div className="mt-auto space-y-3">
                                                    <div className="h-10 w-full bg-white/5 rounded-lg" />
                                                    <div className="h-10 w-full bg-white/10 rounded-lg" />
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        // ACTUAL CONTENT
                                        variations[activeTab]?.map((v: any, i: number) => {
                                            const getPlatformStyles = () => {
                                                switch (activeTab) {
                                                    case 'instagram': return { color: 'text-pink-400', btn: 'from-pink-600 to-rose-600' };
                                                    case 'linkedin': return { color: 'text-blue-400', btn: 'from-blue-600 to-indigo-600' };
                                                    case 'twitter': return { color: 'text-sky-400', btn: 'from-sky-500 to-blue-500' };
                                                    case 'threads': return { color: 'text-zinc-200', btn: 'from-zinc-700 to-zinc-900' };
                                                    case 'facebook': return { color: 'text-blue-500', btn: 'from-blue-700 to-blue-800' };
                                                    default: return { color: 'text-pink-400', btn: 'from-pink-600 to-rose-600' };
                                                }
                                            };
                                            const styles = getPlatformStyles();

                                            // Inside render loop:
                                            const isRegenerating = regeneratingId?.tab === activeTab && regeneratingId?.index === i;

                                            return (
                                                <div key={i} className={`bg-[#111] border border-white/5 rounded-2xl p-6 flex flex-col group hover:border-pink-500/30 transition-all relative animate-in fade-in zoom-in-95 duration-500 delay-[100ms] ${isRegenerating ? 'opacity-50 pointer-events-none' : ''}`} style={{ animationDelay: `${i * 100}ms` }}>

                                                    {/* Regenerate Button - Top Right */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRegenerate(activeTab, i, v);
                                                        }}
                                                        disabled={isRegenerating}
                                                        className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Regenerate this variation"
                                                    >
                                                        <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                                                    </button>

                                                    <div className={`flex items-center gap-2 mb-4 text-sm font-medium ${styles.color}`}>
                                                        {activeTab === 'instagram' && <Instagram className="w-4 h-4" />}
                                                        {activeTab === 'linkedin' && <Linkedin className="w-4 h-4" />}
                                                        {activeTab === 'twitter' && <Twitter className="w-4 h-4" />}
                                                        {activeTab === 'threads' && <AtSign className="w-4 h-4" />}
                                                        {activeTab === 'facebook' && <Facebook className="w-4 h-4" />}
                                                        {v.title}
                                                    </div>

                                                    {isRegenerating ? (
                                                        <>
                                                            {/* Loading Skeleton during regeneration */}
                                                            <div className="flex-1 space-y-4 mb-6 animate-pulse mt-4">
                                                                <div className="h-3 w-full bg-white/5 rounded" />
                                                                <div className="h-3 w-[90%] bg-white/5 rounded" />
                                                                <div className="h-3 w-[85%] bg-white/5 rounded" />
                                                                <div className="h-3 w-full bg-white/5 rounded" />
                                                                <div className="h-3 w-[60%] bg-white/5 rounded" />
                                                            </div>

                                                            <div className="flex flex-wrap gap-2 mb-8 animate-pulse">
                                                                <div className="h-5 w-16 bg-white/10 rounded-full" />
                                                                <div className="h-5 w-20 bg-white/10 rounded-full" />
                                                                <div className="h-5 w-12 bg-white/10 rounded-full" />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="flex-1 whitespace-pre-wrap text-zinc-300 text-sm leading-relaxed mb-6 font-sans">
                                                                {v.caption}
                                                            </div>

                                                            <div className="mb-6 space-y-4">
                                                                {typeof v.hashtags === 'object' && !Array.isArray(v.hashtags) ? (
                                                                    <>
                                                                        {['niche', 'broad', 'highEngagement'].map((key) => (
                                                                            <div key={key} className="space-y-1.5">
                                                                                <span className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">{key === 'highEngagement' ? 'Trending' : key}</span>
                                                                                <div className="flex flex-wrap gap-1">
                                                                                    {(v.hashtags[key] || []).map((tag: string) => {
                                                                                        const isSelected = (selectedHashtags[`${activeTab}-${i}`] || []).includes(tag);
                                                                                        return (
                                                                                            <button
                                                                                                key={tag}
                                                                                                onClick={() => toggleHashtag(activeTab, i, tag)}
                                                                                                className={`text-[10px] px-1.5 py-0.5 rounded border transition-all ${isSelected
                                                                                                    ? "text-pink-400 bg-pink-500/10 border-pink-500/30 font-bold"
                                                                                                    : "text-zinc-500 bg-white/5 border-white/5 opacity-50 hover:opacity-100"
                                                                                                    }`}
                                                                                            >
                                                                                                {tag}
                                                                                            </button>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </>
                                                                ) : (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {(Array.isArray(v.hashtags) ? v.hashtags : []).map((tag: string) => {
                                                                            const isSelected = (selectedHashtags[`${activeTab}-${i}`] || []).includes(tag);
                                                                            return (
                                                                                <button
                                                                                    key={tag}
                                                                                    onClick={() => toggleHashtag(activeTab, i, tag)}
                                                                                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-all ${isSelected
                                                                                        ? "text-pink-400 bg-pink-500/10 border-pink-500/30 font-bold"
                                                                                        : "text-zinc-500 bg-white/5 border-white/5 opacity-50 hover:opacity-100"
                                                                                        }`}
                                                                                >
                                                                                    {tag}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}

                                                    <div className="mt-auto space-y-3">
                                                        <button
                                                            onClick={() => {
                                                                const tags = selectedHashtags[`${activeTab}-${i}`] || [];
                                                                navigator.clipboard.writeText(`${v.caption}\n\n${tags.join(' ')}`);
                                                                toast.success("Caption copied!");
                                                            }}
                                                            disabled={isRegenerating}
                                                            className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
                                                        >
                                                            <Copy className="w-4 h-4" /> Copy Caption
                                                        </button>

                                                        <button
                                                            onClick={() => handleSelectCaption(v, activeTab, i)}
                                                            disabled={isRegenerating}
                                                            className={`w-full py-2 bg-gradient-to-r text-white rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all shadow-lg hover:opacity-90 disabled:opacity-50 ${styles.btn}`}
                                                        >
                                                            <CheckCircle2 className="w-4 h-4" /> Good to Go
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        {!loading && variations.instagram.length === 0 && (
                            <div className="text-center text-zinc-600 py-12 italic">
                                Ready to create...
                            </div>
                        )}
                    </div>
                )}


                {/* STEP 2: MEDIA UPLOAD & FINALIZATION */}
                {step === 2 && selectedCaption && (
                    <div className="flex flex-col lg:flex-row gap-8 items-start animate-in fade-in slide-in-from-right-8 duration-500">

                        {/* LEFT COLUMN: CREATION (Main Editor & Assets) */}
                        <div className="w-full lg:w-[60%] space-y-8">
                            {/* Editor Section */}
                            <div className="bg-[#111] border border-white/5 rounded-2xl p-6 shadow-xl">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-zinc-200 flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-pink-500" />
                                        Final Polish
                                    </h3>
                                    <button
                                        onClick={copyFinalCaption}
                                        className="py-1.5 px-3 bg-white/5 hover:bg-white/10 text-[10px] uppercase tracking-widest font-black text-zinc-400 hover:text-white rounded-lg border border-white/5 transition-all flex items-center gap-2"
                                    >
                                        <Copy className="w-3.5 h-3.5" /> Copy Full Post
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Caption</label>
                                        <textarea
                                            value={selectedCaption.caption}
                                            onChange={(e) => setSelectedCaption({ ...selectedCaption, caption: e.target.value })}
                                            className="w-full h-80 bg-black/50 border border-white/10 rounded-xl p-5 text-zinc-200 resize-none focus:outline-none focus:ring-1 focus:ring-pink-500/30 font-sans leading-relaxed text-lg lg:text-xl shadow-inner"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Optimized Hashtags</label>
                                        <textarea
                                            value={typeof selectedCaption.hashtags === 'string'
                                                ? selectedCaption.hashtags
                                                : Array.isArray(selectedCaption.hashtags)
                                                    ? selectedCaption.hashtags.join(" ")
                                                    : [...Object.values(selectedCaption.hashtags)].flat().join(" ")
                                            }
                                            onChange={(e) => setSelectedCaption({ ...selectedCaption, hashtags: e.target.value })}
                                            className="w-full h-24 bg-black/50 border border-white/10 rounded-xl p-4 text-zinc-400 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-pink-500/30 font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Media Assets Section */}
                            <div className="bg-[#111] border border-white/5 rounded-2xl p-6 shadow-xl">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-zinc-200 flex items-center gap-2">
                                        <ImageIcon className="w-5 h-5 text-blue-500" />
                                        Media Assets
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{mediaFiles.length} / 10 Assets</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                    {/* Upload Trigger */}
                                    <div
                                        className="md:col-span-4 border-2 border-dashed border-zinc-800/50 hover:border-blue-500/30 hover:bg-blue-500/5 rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[160px] group"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*,video/*"
                                            className="hidden"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                        />
                                        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center mb-3 text-zinc-500 group-hover:text-blue-400 group-hover:scale-110 transition-all">
                                            <Plus className="w-6 h-6" />
                                        </div>
                                        <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Add Media</h4>
                                    </div>

                                    {/* AI Asset Architect */}
                                    <div className="md:col-span-8 p-6 bg-zinc-900/30 rounded-xl border border-white/5 flex flex-col justify-between">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-indigo-400" />
                                                <h4 className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">AI Asset Architect</h4>
                                            </div>
                                            <p className="text-xs text-zinc-500 leading-relaxed italic">
                                                {imagePrompt ? "Generated creative direction for your visuals:" : "Stuck for an image? I can architect a creative direction based on your caption."}
                                            </p>

                                            {imagePrompt && (
                                                <div className="bg-black/40 p-3 rounded-lg border border-white/5 animate-in fade-in slide-in-from-top-2">
                                                    <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
                                                        {imagePrompt}
                                                    </p>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(imagePrompt);
                                                            toast.success("Prompt copied!");
                                                        }}
                                                        className="mt-2 text-[9px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-widest flex items-center gap-1"
                                                    >
                                                        <Copy className="w-3 h-3" /> Copy Prompt
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {!imagePrompt && (
                                            <button
                                                onClick={async () => {
                                                    setGeneratingPrompt(true);
                                                    setTimeout(() => {
                                                        const p = `High-quality commercial photography, ultra-realistic, cinematic lighting. A visual representation of: ${selectedCaption.caption.slice(0, 50)}... Minimalist corporate aesthetic, premium textures.`;
                                                        setImagePrompt(p);
                                                        setGeneratingPrompt(false);
                                                        toast.success("Creative direction architected!");
                                                    }, 1500);
                                                }}
                                                disabled={generatingPrompt}
                                                className="mt-4 w-fit py-1.5 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2"
                                            >
                                                {generatingPrompt ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                Architect Prompt
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* File Previews Grid */}
                                {mediaFiles.length > 0 && (
                                    <div className="mt-8 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                        {mediaFiles.map((file, idx) => (
                                            <div key={idx} className="relative aspect-square bg-black rounded-lg overflow-hidden border border-white/10 group shadow-lg">
                                                {file.type.startsWith('image/') ? (
                                                    <img
                                                        src={URL.createObjectURL(file)}
                                                        alt="preview"
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
                                                        <Film className="w-8 h-8" />
                                                    </div>
                                                )}

                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                                        className="p-2 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-full transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT SIDEBAR: DISTRIBUTION (Sticky Preview & Publish) */}
                        <div className="w-full lg:w-[40%] space-y-8 sticky top-6">
                            {/* Live Visual Preview */}
                            <div className="bg-[#111] border border-white/5 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 pointer-events-none opacity-5 group-hover:opacity-10 transition-opacity">
                                    <LayoutGrid className="w-32 h-32 text-indigo-500 translate-x-8 -translate-y-8" />
                                </div>

                                <h3 className="text-xl font-bold mb-6 text-zinc-200 flex items-center gap-2 relative z-10">
                                    <LayoutGrid className="w-5 h-5 text-indigo-500" />
                                    Live Social Preview
                                </h3>

                                <div className="relative z-10">
                                    <SocialPreview
                                        platform={activeTab}
                                        caption={selectedCaption.caption}
                                        hashtags={typeof selectedCaption.hashtags === 'string'
                                            ? selectedCaption.hashtags
                                            : Array.isArray(selectedCaption.hashtags)
                                                ? selectedCaption.hashtags.join(' ')
                                                : [...Object.values(selectedCaption.hashtags)].flat().join(' ')
                                        }
                                        mediaFiles={mediaFiles}
                                    />
                                </div>

                                {/* QUICK-POST ACTION CENTER (Embedded here for quick access) */}
                                <div className="mt-8 pt-6 border-t border-white/5 relative z-10">
                                    <QuickPostActionCenter
                                        postId="marketing-preview"
                                        caption={selectedCaption.caption}
                                        hashtags={Array.isArray(selectedCaption.hashtags) ? selectedCaption.hashtags : []}
                                        platform={activeTab}
                                        mediaUrls={mediaFiles.map(f => URL.createObjectURL(f))}
                                    />
                                </div>
                            </div>

                            {/* Scheduling & Core Actions */}
                            <div className="bg-[#111] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-6">
                                <div className="space-y-6">
                                    <div className="space-y-4 bg-black/20 p-5 rounded-2xl border border-white/5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <CalendarClock className="w-4 h-4 text-emerald-400" /> Release Schedule
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Reminders</span>
                                                <button
                                                    onClick={() => setShowReminders(!showReminders)}
                                                    className={`w-8 h-4 rounded-full transition-colors relative ${showReminders ? 'bg-emerald-600' : 'bg-zinc-800'}`}
                                                >
                                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showReminders ? 'left-4.5' : 'left-0.5'}`} />
                                                </button>
                                            </div>
                                        </div>
                                        <DateTimePicker
                                            value={scheduledDate}
                                            onChange={setScheduledDate}
                                            placeholder="Pick launch date..."
                                        />
                                        {showReminders && (
                                            <div className="pt-2 flex gap-2 animate-in fade-in slide-in-from-top-1">
                                                <div className="flex-1 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-300 font-medium">
                                                    Deep Notification Enabled
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        disabled={mediaFiles.length === 0 || !scheduledDate || loading}
                                        className="w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black uppercase tracking-[0.1em] rounded-xl transition-all shadow-xl shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden group"
                                        onClick={handleSchedule}
                                    >
                                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                        {loading ? (
                                            <>
                                                <RefreshCw className="w-5 h-5 animate-spin" />
                                                Finalizing Post...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-5 h-5" />
                                                Push to Astute Calendar
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
