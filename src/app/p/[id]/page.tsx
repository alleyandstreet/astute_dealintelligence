"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
    Copy,
    Download,
    Check,
    Instagram,
    Linkedin,
    Twitter,
    AtSign,
    ExternalLink,
    Loader2,
    Sparkles,
    Smartphone,
    X
} from "lucide-react";
import { toast } from "sonner";

export default function MobilePostHandoff() {
    const params = useParams();
    const id = params.id as string;
    const [post, setPost] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchPost();
    }, [id]);

    const fetchPost = async () => {
        try {
            const res = await fetch(`/api/instagram/schedule/${id}`);
            if (res.ok) {
                const data = await res.json();
                setPost(data);
            } else {
                toast.error("Post not found or unauthorized");
            }
        } catch (error) {
            console.error("Failed to fetch post:", error);
            toast.error("Error loading post");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        const text = `${post.caption}\n\n${post.hashtags?.map((t: string) => `#${t}`).join(' ') || ""}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Caption copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
                <Loader2 className="w-12 h-12 animate-spin text-pink-500 mb-4" />
                <p className="text-zinc-500 font-medium">Preparing your assets...</p>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8 text-center">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <X className="w-10 h-10 text-red-500" />
                </div>
                <h1 className="text-2xl font-black mb-4 uppercase tracking-tighter">Bridge Broken</h1>
                <p className="text-zinc-500 mb-8 text-sm leading-relaxed">This post could not be found or the link has expired.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-8 py-4 bg-zinc-900 text-white font-bold rounded-2xl w-full border border-white/5"
                >
                    Try Refreshing
                </button>
            </div>
        );
    }

    let mediaUrls = [];
    try {
        mediaUrls = JSON.parse(post.mediaUrls);
    } catch (e) {
        mediaUrls = Array.isArray(post.mediaUrls) ? post.mediaUrls : [post.mediaUrls];
    }

    // Filter out potential nulls or empty strings
    mediaUrls = mediaUrls.filter((url: string) => !!url);

    const platform = post.platform?.toLowerCase() || 'instagram';
    const platformColors: Record<string, string> = {
        instagram: "from-[#f09433] via-[#dc2743] to-[#bc1888]",
        linkedin: "from-[#0077b5] to-[#004182]",
        twitter: "from-[#1DA1F2] to-[#0c85d0]",
        threads: "from-zinc-800 to-black",
        facebook: "from-[#1877F2] to-[#0e5cad]"
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white pb-32 font-sans selection:bg-pink-500/30">
            {/* Ultra-Modern Header */}
            <div className={`h-1.5 bg-gradient-to-r ${platformColors[platform] || 'from-pink-600 to-purple-600'} w-full sticky top-0 z-50 shadow-[0_4px_20px_rgba(0,0,0,0.5)]`} />

            <div className="max-w-md mx-auto px-6 pt-10 space-y-10">
                {/* Branding */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl">
                            <Smartphone className="w-6 h-6 text-zinc-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight leading-none">POST BRIDGE</h1>
                            <p className="text-[9px] text-zinc-600 uppercase tracking-[0.3em] font-black mt-1">Direct Handoff Protocol</p>
                        </div>
                    </div>
                </div>

                {/* Primary Card */}
                <div className="bg-[#111] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    {/* Media Preview / Download Area */}
                    <div className="relative aspect-square bg-zinc-900 flex items-center justify-center overflow-hidden">
                        {mediaUrls[0] ? (
                            mediaUrls[0].endsWith('.mp4') ? (
                                <video src={mediaUrls[0]} controls className="w-full h-full object-cover" />
                            ) : (
                                <img src={mediaUrls[0]} alt="Post content" className="w-full h-full object-cover" />
                            )
                        ) : (
                            <div className="p-12 text-center text-zinc-800">
                                <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p className="text-xs uppercase tracking-widest font-black">No Media Content</p>
                            </div>
                        )}

                        {mediaUrls[0] && (
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
                                <a
                                    href={mediaUrls[0]}
                                    download
                                    target="_blank"
                                    className="w-full py-5 bg-white text-black rounded-2xl flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest active:scale-95 transition-all shadow-2xl hover:bg-zinc-100 ring-4 ring-black/20"
                                >
                                    <Download className="w-6 h-6" /> Save to Device
                                </a>
                                <p className="text-[8px] text-zinc-500 text-center mt-3 uppercase tracking-widest font-bold">Tap to save media for posting</p>
                            </div>
                        )}
                    </div>

                    {/* Content Area */}
                    <div className="p-8 space-y-8">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-[9px] font-black tracking-[0.2em] text-zinc-600 uppercase border-b border-white/5 pb-2">
                                <span>Caption & Tags</span>
                                <span className="text-zinc-800">{post.hashtags?.length || 0} TAGS</span>
                            </div>
                            <div className="relative group">
                                <div className="absolute -inset-4 bg-gradient-to-br from-pink-500/5 to-purple-500/5 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative">
                                    <p className="text-base text-zinc-200 leading-relaxed font-medium whitespace-pre-wrap">
                                        {post.caption}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5 mt-4">
                                        {post.hashtags?.map((tag: string) => (
                                            <span key={tag} className="text-xs font-bold text-[#459aff] hover:underline cursor-pointer">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleCopy}
                            className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] shadow-2xl ring-1 ring-white/10 ${copied ? "bg-green-500 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-white"
                                }`}
                        >
                            {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                            {copied ? "COPIED" : "Copy Caption"}
                        </button>
                    </div>
                </div>

                {/* Final step: Launch */}
                <div className="space-y-4 pt-4">
                    <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em] text-center">Final Step: Launch Platform</p>
                    <div className="grid grid-cols-1 gap-3 px-4">
                        {(() => {
                            const links: Record<string, string> = {
                                instagram: "instagram://library",
                                linkedin: "linkedin://",
                                twitter: "twitter://post",
                                threads: "barcelona://",
                                facebook: "fb://"
                            };
                            const webLinks: Record<string, string> = {
                                instagram: "https://www.instagram.com/",
                                linkedin: "https://www.linkedin.com/",
                                twitter: "https://twitter.com/",
                                threads: "https://www.threads.net/",
                                facebook: "https://www.facebook.com/"
                            };

                            const link = links[platform] || webLinks[platform];
                            const Icons: Record<string, any> = {
                                instagram: Instagram,
                                linkedin: Linkedin,
                                twitter: Twitter,
                                threads: AtSign,
                                facebook: ExternalLink
                            };
                            const Icon = Icons[platform] || Sparkles;

                            return (
                                <a
                                    href={link}
                                    className={`w-full py-6 rounded-[2rem] bg-gradient-to-br ${platformColors[platform] || 'from-pink-600 to-purple-600'} text-white flex items-center justify-center gap-4 font-black text-sm uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all ring-1 ring-white/20`}
                                >
                                    <Icon className="w-6 h-6" />
                                    Open {platform}
                                </a>
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* Micro-Interaction Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-8 pt-12 bg-gradient-to-t from-black via-black to-transparent pointer-events-none">
                <div className="max-w-md mx-auto pointer-events-auto">
                    <div className="bg-[#1A1A1A]/80 backdrop-blur-3xl border border-white/5 p-5 rounded-[2rem] flex items-center gap-4 shadow-3xl">
                        <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-500 flex-shrink-0">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] text-white font-black uppercase tracking-widest mb-0.5">One-Tap Posting</p>
                            <p className="text-[9px] text-zinc-500 leading-tight">Download media first, copy caption, then tap open platform.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
