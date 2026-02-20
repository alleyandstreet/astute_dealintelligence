"use client";

import React, { useState } from "react";
import {
    Sparkles,
    Copy,
    Download,
    Smartphone,
    Loader2,
    Instagram,
    Linkedin,
    Twitter,
    Facebook,
    AtSign
} from "lucide-react";
import { toast } from "sonner";

interface QuickPostActionCenterProps {
    postId: string;
    caption: string;
    hashtags: string[];
    platform: string;
    mediaUrls: string[]; // Parsed array of URLs
}

export const QuickPostActionCenter: React.FC<QuickPostActionCenterProps> = ({
    postId,
    caption,
    hashtags,
    platform,
    mediaUrls
}) => {
    const [showQR, setShowQR] = useState(false);
    const [copyingImage, setCopyingImage] = useState(false);
    const [handoffId, setHandoffId] = useState<string | null>(null);
    const [localIp, setLocalIp] = useState<string | null>(null);
    const [preparingHandoff, setPreparingHandoff] = useState(false);

    const fullCaption = `${caption}\n\n${hashtags.join(' ')}`;

    const prepareHandoff = async () => {
        setPreparingHandoff(true);
        try {
            // 1. Fetch Local IP
            const ipRes = await fetch('/api/handoff/local-ip');
            const { ip } = await ipRes.json();
            setLocalIp(ip);

            // 2. If it's a preview or we need persistence, save to bridge
            if (postId === "marketing-preview" && !handoffId) {
                // Upload blobs if any
                const blobUrls = mediaUrls.filter(url => url.startsWith('blob:'));
                let uploadedMedia = mediaUrls.filter(url => !url.startsWith('blob:'));

                if (blobUrls.length > 0) {
                    const formData = new FormData();
                    for (const url of blobUrls) {
                        const res = await fetch(url);
                        const blob = await res.blob();
                        formData.append("files", blob, "preview.png");
                    }
                    const uploadRes = await fetch('/api/handoff/upload', {
                        method: 'POST',
                        body: formData
                    });
                    const { urls } = await uploadRes.json();
                    uploadedMedia = [...uploadedMedia, ...urls];
                }

                // Save handoff record
                const saveRes = await fetch('/api/handoff/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        caption,
                        hashtags,
                        platform,
                        mediaUrls: uploadedMedia
                    })
                });
                const data = await saveRes.json();
                if (data.id) setHandoffId(data.id);
            }
        } catch (error) {
            console.error("Handoff preparation failed:", error);
            toast.error("Failed to prepare phone bridge");
        } finally {
            setPreparingHandoff(false);
        }
    };

    const getViewUrl = () => {
        const id = handoffId || postId;
        const currentPort = typeof window !== 'undefined' ? window.location.port : '3000';
        const host = localIp ? `${localIp}:${currentPort}` : (typeof window !== 'undefined' ? window.location.host : '');
        const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
        return `${protocol}//${host}/bridge/${id}`;
    };

    const handleMagicCopy = async (imageUrl: string) => {
        if (!imageUrl) return;
        setCopyingImage(true);
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();

            // Convert to PNG for clipboard compatibility
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = URL.createObjectURL(blob);

            await new Promise((resolve) => {
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0);

                    canvas.toBlob(async (pngBlob) => {
                        if (pngBlob) {
                            try {
                                const data = [new ClipboardItem({ [pngBlob.type]: pngBlob })];
                                await navigator.clipboard.write(data);
                                toast.success("Image copied to clipboard!");
                            } catch (err) {
                                console.error("Clipboard write error:", err);
                                toast.error("Failed to copy image to clipboard");
                            }
                        }
                        resolve(null);
                    }, 'image/png');
                };
            });
        } catch (error) {
            console.error("Magic Copy error:", error);
            toast.error("Failed to process image for copying");
        } finally {
            setCopyingImage(false);
        }
    };

    const platformKey = platform.toLowerCase();
    const links: Record<string, string> = {
        instagram: "https://www.instagram.com/",
        linkedin: "https://www.linkedin.com/feed/",
        twitter: "https://twitter.com/compose/tweet",
        threads: "https://www.threads.net/",
        facebook: "https://www.facebook.com/"
    };
    const link = links[platformKey] || "https://google.com";

    const icons: Record<string, any> = {
        instagram: Instagram,
        linkedin: Linkedin,
        twitter: Twitter,
        threads: AtSign,
        facebook: Facebook
    };
    const Icon = icons[platformKey] || Sparkles;

    const handleSmartCopy = () => {
        navigator.clipboard.writeText(fullCaption);
        toast.success("Caption copied (Smart Copy)");
        window.open(link, '_blank');
    };

    return (
        <div className="p-6 border-t border-white/10 bg-zinc-900/50 rounded-b-3xl">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-pink-500" />
                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Quick-Post Action Center</h3>
            </div>

            <div className="space-y-6">
                {/* Step 1: Preparation */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-zinc-500 border border-white/10">1</div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Prepare Assets</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(fullCaption);
                                toast.success("Caption copied!");
                            }}
                            className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all border border-white/5 active:scale-95"
                        >
                            <Copy className="w-3.5 h-3.5" /> Caption
                        </button>
                        {mediaUrls.length > 0 && (
                            <a
                                href={mediaUrls[0]}
                                download
                                target="_blank"
                                className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all border border-white/5 active:scale-95"
                            >
                                <Download className="w-3.5 h-3.5" /> Media
                            </a>
                        )}
                    </div>
                    {mediaUrls.length > 0 && !mediaUrls[0].endsWith('.mp4') && (
                        <button
                            onClick={() => handleMagicCopy(mediaUrls[0])}
                            disabled={copyingImage}
                            className="w-full px-4 py-2.5 bg-pink-500/10 hover:bg-pink-500/20 text-pink-500 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all border border-pink-500/20 active:scale-[0.98]"
                        >
                            {copyingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Magic Copy Photo
                        </button>
                    )}
                </div>

                {/* Step 2: Distribution */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-pink-500/10 flex items-center justify-center text-[10px] font-bold text-pink-500 border border-pink-500/20">2</div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Launch & Post</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <button
                            onClick={handleSmartCopy}
                            className="flex-[3] px-4 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest shadow-lg shadow-pink-900/20 transition-all border border-pink-500/20 active:scale-[0.98]"
                        >
                            <Icon className="w-5 h-5" />
                            Open {platform}
                        </button>
                        <button
                            onClick={() => {
                                if (!showQR) prepareHandoff();
                                setShowQR(!showQR);
                            }}
                            className={`flex-1 px-4 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all border ${showQR ? "bg-white text-black border-white" : "bg-white/5 hover:bg-white/10 text-white border-white/5"} active:scale-[0.98]`}
                        >
                            <Smartphone className="w-4 h-4" />
                            {showQR ? "Close" : "Phone"}
                        </button>
                    </div>
                </div>
            </div>

            {showQR && (
                <div className="mt-4 p-4 bg-white rounded-2xl flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-2">
                    {preparingHandoff ? (
                        <div className="py-8 flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
                            <p className="text-[10px] font-black text-black uppercase tracking-widest">Bridging to phone...</p>
                        </div>
                    ) : (
                        <>
                            <div className="text-center">
                                <p className="text-[10px] font-black text-black uppercase tracking-widest mb-1">Scan to Post on Mobile</p>
                                <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold">Fast-track your {platform} content</p>
                            </div>
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getViewUrl())}`}
                                alt="QR Code"
                                className="w-32 h-32"
                            />
                            <div className="flex items-center gap-2 text-[8px] font-bold text-zinc-400 bg-zinc-100 px-3 py-1.5 rounded-full overflow-hidden max-w-full">
                                <span className="truncate">{getViewUrl()}</span>
                                <Copy
                                    className="w-3 h-3 cursor-pointer hover:text-black transition-colors"
                                    onClick={() => {
                                        navigator.clipboard.writeText(getViewUrl());
                                        toast.success("Handoff URL copied!");
                                    }}
                                />
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
