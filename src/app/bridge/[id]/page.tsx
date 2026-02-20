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
    Sparkles,
    Smartphone,
    X,
    Clock,
    AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function StandalonePopOutBridge() {
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

                setPost(data);
            } else {
                const errorData = await res.json().catch(() => ({}));
                console.error("Bridge link not found:", errorData);
                toast.error(`Bridge Error: ${res.status}`);
            }
        } catch (error) {
            console.error("Failed to fetch post:", error);
            toast.error("Error connecting to bridge: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setLoading(false);
        }
    };


    const handleCopy = async () => {
        const text = `${post.caption}\n\n${post.hashtags?.map((t: string) => `#${t}`).join(' ') || ""}`;

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                toast.success("Caption ready for posting!");
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "-9999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) {
                    setCopied(true);
                    toast.success("Caption ready for posting!");
                } else {
                    throw new Error("Copy failed");
                }
            }
        } catch (err) {
            console.error("Clipboard access failed:", err);
            toast.error("Please long-press text to copy manually.");
        }
        setTimeout(() => setCopied(false), 2000);
    };


    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white p-6">
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                    <div className="w-16 h-16 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin" />
                </motion.div>
                <p className="mt-6 text-zinc-600 font-black uppercase tracking-[0.3em] text-[10px]">Syncing Assets...</p>
            </div>
        );
    }


    if (!post) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8 text-center">
                <X className="w-12 h-12 text-zinc-900 mb-6" />
                <h1 className="text-xl font-black mb-4 uppercase tracking-tighter">Bridge Fault</h1>
                <button onClick={() => window.location.reload()} className="px-6 py-2 bg-white/5 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/10">Retry</button>
            </div>
        );
    }

    let mediaUrls = [];
    try {
        mediaUrls = JSON.parse(post.mediaUrls);
    } catch (e) {
        mediaUrls = Array.isArray(post.mediaUrls) ? post.mediaUrls : [post.mediaUrls];
    }
    mediaUrls = mediaUrls.filter((url: string) => !!url);

    const platform = post.platform?.toLowerCase() || 'instagram';
    const platformColors: Record<string, string> = {
        instagram: "from-amber-400 via-rose-500 to-fuchsia-600",
        linkedin: "from-blue-600 to-blue-800",
        twitter: "from-sky-400 to-sky-600",
        threads: "from-zinc-700 to-black",
        facebook: "from-blue-700 to-blue-900"
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white pb-32 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
            <motion.div initial={{ y: -50 }} animate={{ y: 0 }} className="bg-zinc-900/60 backdrop-blur-2xl border-b border-white/5 py-3 px-6 sticky top-0 z-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 italic">Astute Direct</span>
                </div>
            </motion.div>

            <div className="max-w-[390px] mx-auto px-5 pt-8 space-y-8">
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
                    <div className="bg-gradient-to-r from-cyan-500 to-purple-600 bg-clip-text text-transparent">
                        <h1 className="text-2xl font-black tracking-tighter italic uppercase">Distribution Hub</h1>
                    </div>
                    <p className="text-[8px] text-zinc-600 uppercase tracking-[0.5em] font-black">Sync Engine Active</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)] relative">
                    <div className="relative aspect-square bg-[#050505] flex items-center justify-center overflow-hidden">
                        {mediaUrls[0] ? (
                            <div className="w-full h-full">
                                {mediaUrls[0].endsWith('.mp4') ? (
                                    <video src={mediaUrls[0]} controls className="w-full h-full object-contain" />
                                ) : (
                                    <img src={mediaUrls[0]} alt="Post" className="w-full h-full object-contain p-2" />
                                )}
                            </div>
                        ) : (
                            <div className="p-12 text-center text-zinc-800">
                                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                <p className="text-[10px] uppercase font-black italic">Asset Missing</p>
                            </div>
                        )}

                        {mediaUrls[0] && (
                            <div className="absolute inset-x-0 bottom-0 p-6 pt-16 bg-gradient-to-t from-black via-black/70 to-transparent">
                                <motion.a whileTap={{ scale: 0.96 }} href={mediaUrls[0]} download target="_blank" className="w-full py-4 bg-white text-black rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-2xl hover:bg-zinc-100 transition-all ring-4 ring-black/40">
                                    <Download className="w-5 h-5" /> Save Media
                                </motion.a>
                            </div>
                        )}
                    </div>

                    <div className="p-7 space-y-7 bg-gradient-to-b from-[#0c0c0e] to-black">
                        <div className="space-y-4 text-center sm:text-left">
                            <div className="w-8 h-1 bg-zinc-800 rounded-full mx-auto sm:mx-0" />
                            <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                                {post.caption}
                            </p>
                            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                                {post.hashtags?.map((tag: string) => (
                                    <span key={tag} className="text-[10px] font-bold text-cyan-500/70">#{tag}</span>
                                ))}
                            </div>
                        </div>

                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={handleCopy}
                            className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all shadow-xl border ${copied ? "bg-green-500 border-green-400 text-white" : "bg-white/5 border-white/10 text-white hover:bg-white/10"}`}
                        >
                            <div className="flex items-center gap-2">
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                <span>{copied ? "CAPTURED" : "Copy Caption Bundle"}</span>
                            </div>
                        </motion.button>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-6 pb-8">
                    <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-white/5" />
                        <span className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.4em] italic">Deploy Cluster</span>
                        <div className="h-px flex-1 bg-white/5" />
                    </div>

                    <motion.a
                        whileTap={{ scale: 0.96 }}
                        href={platform === 'instagram' ? "instagram://library" : platform === 'twitter' ? "twitter://post" : platform === 'threads' ? "barcelona://" : platform === 'facebook' ? "fb://" : "linkedin://"}
                        className={`w-full py-7 rounded-[2.5rem] bg-gradient-to-br ${platformColors[platform] || 'from-pink-600 to-purple-600'} text-white flex flex-col items-center justify-center gap-2 font-black shadow-2xl transition-all ring-1 ring-white/10 relative overflow-hidden group`}
                    >
                        {(() => {
                            const Icons: Record<string, any> = { instagram: Instagram, linkedin: Linkedin, twitter: Twitter, threads: AtSign, facebook: ExternalLink };
                            const Icon = Icons[platform] || Sparkles;
                            return <Icon className="w-8 h-8 drop-shadow-lg" />;
                        })()}
                        <span className="text-[10px] uppercase tracking-[0.3em] drop-shadow-md">Launch {platform}</span>
                    </motion.a>
                </motion.div>
            </div>

            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-0 left-0 right-0 p-6 z-[60] pointer-events-none">
                <div className="max-w-[350px] mx-auto pointer-events-auto">
                    <div className="bg-zinc-900/60 backdrop-blur-3xl border border-white/10 p-4 rounded-[2rem] flex items-center gap-4 shadow-3xl">
                        <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center flex-shrink-0">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] text-white font-black uppercase tracking-widest italic">Sync Flow</p>
                            <p className="text-[9px] text-zinc-500 font-medium">Save Media → Copy Caption → Launch Platform.</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
