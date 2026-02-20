"use client";

import React, { useState, useEffect } from "react";
import {
    Smartphone,
    Sparkles,
    Copy,
    Download,
    RefreshCw,
    X,
    CheckCircle2,
    Upload,
    Zap,
    MessageSquare,
    ChevronRight,
    Loader2
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { SocialPreview } from "@/components/SocialPreview";
import { QuickPostActionCenter } from "@/components/QuickPostActionCenter";

export default function PragmaticPreviewPage() {
    const [caption, setCaption] = useState("");
    const [hashtags, setHashtags] = useState<string[]>([]);
    const [hashtagInput, setHashtagInput] = useState("");
    const [platform, setPlatform] = useState<any>("instagram");
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [mediaUrls, setMediaUrls] = useState<string[]>([]);
    const [isBridging, setIsBridging] = useState(false);

    // Handle Hashtags
    const handleHashtagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            const tag = hashtagInput.trim().replace(/^#/, "");
            if (tag && !hashtags.includes(tag)) {
                setHashtags([...hashtags, tag]);
                setHashtagInput("");
            }
        }
    };

    const removeHashtag = (tag: string) => {
        setHashtags(hashtags.filter((t) => t !== tag));
    };

    // Handle Media Upload
    const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setMediaFiles((prev) => [...prev, ...files]);
            const urls = files.map((file) => URL.createObjectURL(file));
            setMediaUrls((prev) => [...prev, ...urls]);
            toast.success(`${files.length} asset(s) added`);
        }
    };

    const removeMedia = (index: number) => {
        const newFiles = [...mediaFiles];
        const newUrls = [...mediaUrls];
        URL.revokeObjectURL(newUrls[index]);
        newFiles.splice(index, 1);
        newUrls.splice(index, 1);
        setMediaFiles(newFiles);
        setMediaUrls(newUrls);
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 lg:p-12 mb-20 md:mb-0">
            <Toaster position="top-right" theme="dark" />

            {/* Header Section */}
            <div className="max-w-7xl mx-auto mb-12 space-y-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500">
                        <Smartphone className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-white text-transparent bg-clip-text w-fit leading-tight">
                            Pragmatic Preview
                        </h1>
                        <p className="text-zinc-500 text-lg">Fast-track your content to your phone for a 10s posting workflow.</p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">

                {/* LEFT COLUMN: BRIDGE CONFIG */}
                <div className="w-full lg:w-[60%] space-y-8">

                    {/* Platform & Caption */}
                    <div className="bg-[#111] border border-white/5 rounded-3xl p-8 shadow-2xl space-y-8">
                        <div className="flex flex-col gap-4">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-1">Social Platform</label>
                            <div className="flex flex-wrap bg-black/40 p-1.5 rounded-2xl border border-white/5 gap-1.5">
                                {["instagram", "linkedin", "twitter", "threads", "facebook"].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPlatform(p)}
                                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${platform === p ? "bg-white text-black shadow-xl scale-[1.02]" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-1">Post Caption</label>
                            <textarea
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="Paste your caption here..."
                                className="w-full h-48 bg-black/40 border border-white/10 rounded-2xl p-6 text-base text-zinc-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all resize-none placeholder:text-zinc-800"
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-1">Optimized Hashtags</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {hashtags.map((tag) => (
                                    <span key={tag} className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold rounded-xl flex items-center gap-2 group animate-in zoom-in-95">
                                        #{tag}
                                        <button onClick={() => removeHashtag(tag)} className="hover:text-white"><X className="w-3 h-3" /></button>
                                    </span>
                                ))}
                            </div>
                            <div className="relative">
                                <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input
                                    type="text"
                                    value={hashtagInput}
                                    onChange={(e) => setHashtagInput(e.target.value)}
                                    onKeyDown={handleHashtagKeyDown}
                                    placeholder="Add hashtags (press Enter or Space)..."
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all placeholder:text-zinc-600"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Media Management */}
                    <div className="bg-[#111] border border-white/5 rounded-3xl p-8 shadow-2xl">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                                    <Upload className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">Media Assets</h3>
                                    <p className="text-xs text-zinc-500">Attach images or videos for your post.</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{mediaFiles.length} / 10 Assets</span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <label className="aspect-square rounded-2xl border-2 border-dashed border-white/5 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group">
                                <input type="file" multiple className="hidden" onChange={handleMediaUpload} accept="image/*,video/*" />
                                <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Zap className="w-6 h-6 text-zinc-600 group-hover:text-cyan-500 transition-colors" />
                                </div>
                                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest group-hover:text-zinc-400">Add Media</span>
                            </label>

                            {mediaUrls.map((url, i) => (
                                <div key={url} className="aspect-square rounded-2xl border border-white/10 overflow-hidden relative group shadow-xl">
                                    <img src={url} alt="Post asset" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            onClick={() => removeMedia(i)}
                                            className="p-3 bg-red-500 text-white rounded-full hover:scale-110 active:scale-95 transition-all"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: PREVIEW & BRIDGE */}
                <div className="w-full lg:w-[40%] space-y-8 sticky top-6">

                    {/* Visual Preview */}
                    <div className="bg-[#111] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8">
                            <div className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-[8px] font-black uppercase tracking-widest border border-cyan-500/20">Live Preview</div>
                        </div>

                        <div className="mt-8">
                            <SocialPreview
                                platform={platform}
                                caption={caption || "Your post caption will appear here..."}
                                hashtags={hashtags.map(t => `#${t}`).join(' ')}
                                mediaFiles={mediaFiles}
                            />
                        </div>
                    </div>

                    {/* Bridge Center */}
                    <div className="bg-[#111] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl relative">
                        <div className="absolute top-0 right-0 p-4 pt-6 pr-6 opacity-20 transform rotate-12 pointer-events-none">
                            <Smartphone className="w-16 h-16 text-white" />
                        </div>
                        <QuickPostActionCenter
                            postId="marketing-preview"
                            caption={caption}
                            hashtags={hashtags}
                            platform={platform}
                            mediaUrls={mediaUrls}
                        />
                    </div>

                    {/* Pro Tip Card */}
                    <div className="bg-gradient-to-br from-cyan-500/5 to-purple-500/5 border border-white/5 rounded-3xl p-8">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-cyan-400">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-bold text-sm">Pragmatic Posting</h4>
                                <p className="text-xs text-zinc-500 leading-relaxed">
                                    Use the <span className="text-white font-bold">Phone Bridge</span> to skip the desktop upload struggle. Scan, copy, and post in under 10 seconds.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
