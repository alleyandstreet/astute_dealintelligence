"use client";

import React from 'react';
import {
    Instagram,
    Linkedin,
    Twitter,
    AtSign,
    Facebook,
    User,
    Heart,
    MessageCircle,
    Send,
    Bookmark,
    MoreHorizontal,
    RefreshCw,
    Upload,
    Share2,
    ChevronLeft,
    ChevronRight,
    AtSign as ThreadsIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SocialPreviewProps {
    platform: 'instagram' | 'linkedin' | 'twitter' | 'threads' | 'facebook';
    caption: string;
    hashtags: string | string[];
    mediaFiles?: File[];
}

export const SocialPreview: React.FC<SocialPreviewProps> = ({ platform, caption, hashtags, mediaFiles = [] }) => {
    // Standardize hashtags
    let hashtagArray: string[] = [];
    if (typeof hashtags === 'string') {
        hashtagArray = hashtags.split(' ').filter(t => t.trim().length > 0);
    } else if (Array.isArray(hashtags)) {
        hashtagArray = hashtags;
    }

    const hashtagString = hashtagArray.join(' ');

    const [previewUrls, setPreviewUrls] = React.useState<string[]>([]);
    const [activeIndex, setActiveIndex] = React.useState(0);

    React.useEffect(() => {
        const urls = mediaFiles.map(file => URL.createObjectURL(file));
        setPreviewUrls(urls);
        return () => urls.forEach(url => URL.revokeObjectURL(url));
    }, [mediaFiles]);

    // --- INSTAGRAM CAROUSEL ---
    const renderInstagram = () => (
        <div className="bg-black border border-white/10 rounded-xl overflow-hidden max-w-sm mx-auto shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="p-3 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[1.5px]">
                        <div className="w-full h-full rounded-full bg-black border border-black flex items-center justify-center">
                            <User className="w-4 h-4 text-white" />
                        </div>
                    </div>
                    <span className="text-sm font-bold text-white">astute_user</span>
                </div>
                <div className="flex items-center gap-3">
                    {previewUrls.length > 1 && (
                        <div className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold text-white/90 border border-white/10">
                            {activeIndex + 1}/{previewUrls.length}
                        </div>
                    )}
                    <MoreHorizontal className="w-5 h-5 text-zinc-400" />
                </div>
            </div>

            <div className="aspect-square bg-zinc-900 flex items-center justify-center relative group">
                {previewUrls.length > 0 ? (
                    <>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeIndex}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="w-full h-full"
                            >
                                <img src={previewUrls[activeIndex]} className="w-full h-full object-cover" alt="" />
                            </motion.div>
                        </AnimatePresence>
                        {previewUrls.length > 1 && (
                            <>
                                {activeIndex > 0 && (
                                    <button onClick={() => setActiveIndex(prev => prev - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                )}
                                {activeIndex < previewUrls.length - 1 && (
                                    <button onClick={() => setActiveIndex(prev => prev + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                )}
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 p-2">
                                    {previewUrls.map((_, i) => (
                                        <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === activeIndex ? "bg-blue-500 scale-125" : "bg-white/30"}`} />
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <div className="text-zinc-700 flex flex-col items-center">
                        <Instagram className="w-12 h-12 mb-2 opacity-20" />
                        <span className="text-[10px] uppercase tracking-widest font-bold opacity-30">Preview Content</span>
                    </div>
                )}
            </div>

            <div className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Heart className="w-6 h-6 text-white" />
                        <MessageCircle className="w-6 h-6 text-white" />
                        <Send className="w-6 h-6 text-white" />
                    </div>
                    <Bookmark className="w-6 h-6 text-white" />
                </div>
                <div className="text-sm space-y-1">
                    <p className="text-zinc-300 leading-snug whitespace-pre-wrap">
                        <span className="font-bold text-white mr-2">astute_user</span>
                        {caption}
                    </p>
                    <div className="text-blue-400 mt-2 font-medium text-xs">{hashtagString}</div>
                </div>
            </div>
        </div>
    );

    // --- LINKEDIN GRID ---
    const renderLinkedinMedia = () => {
        const count = previewUrls.length;
        if (count === 0) {
            return (
                <div className="h-48 bg-zinc-900/50 rounded flex items-center justify-center border border-dashed border-white/5">
                    <Linkedin className="w-10 h-10 text-zinc-800" />
                </div>
            );
        }
        if (count === 1) {
            return (
                <div className="rounded border border-white/5 overflow-hidden">
                    <img src={previewUrls[0]} alt="Post" className="w-full h-auto object-cover" />
                </div>
            );
        }
        if (count === 2) {
            return (
                <div className="grid grid-cols-2 gap-1 rounded border border-white/5 overflow-hidden aspect-[3/2]">
                    <img src={previewUrls[0]} className="w-full h-full object-cover" alt="" />
                    <img src={previewUrls[1]} className="w-full h-full object-cover" alt="" />
                </div>
            );
        }
        if (count === 3) {
            return (
                <div className="grid grid-cols-2 gap-1 rounded border border-white/5 overflow-hidden aspect-[3/2]">
                    <div className="row-span-2 relative">
                        <img src={previewUrls[0]} className="absolute inset-0 w-full h-full object-cover" alt="" />
                    </div>
                    <div className="aspect-square relative">
                        <img src={previewUrls[1]} className="absolute inset-0 w-full h-full object-cover" alt="" />
                    </div>
                    <div className="aspect-square relative">
                        <img src={previewUrls[2]} className="absolute inset-0 w-full h-full object-cover" alt="" />
                    </div>
                </div>
            );
        }
        return (
            <div className="grid grid-cols-2 gap-1 rounded border border-white/5 overflow-hidden aspect-[3/2]">
                <img src={previewUrls[0]} className="w-full h-full object-cover" alt="" />
                <img src={previewUrls[1]} className="w-full h-full object-cover" alt="" />
                <img src={previewUrls[2]} className="w-full h-full object-cover" alt="" />
                <div className="relative">
                    <img src={previewUrls[3]} className="w-full h-full object-cover" alt="" />
                    {count > 4 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-xl font-bold text-white">+{count - 3}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderLinkedin = () => (
        <div className="bg-[#1b1f23] border border-white/10 rounded-xl overflow-hidden max-w-md mx-auto shadow-2xl p-4 space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center border border-white/5">
                        <User className="w-6 h-6 text-zinc-500" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">Astute Member</span>
                        <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                            PE Deal Intelligence • <Share2 className="w-2 h-2" /> 1m
                        </span>
                    </div>
                </div>
                <MoreHorizontal className="w-5 h-5 text-zinc-400" />
            </div>
            <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {caption}
                <div className="text-[#70b5f9] mt-2 font-semibold">
                    {hashtagArray.map(tag => (tag.startsWith('#') ? tag : `#${tag}`)).join(' ')}
                </div>
            </div>
            {renderLinkedinMedia()}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold hover:text-white transition-colors cursor-pointer">
                    <Heart className="w-4 h-4" /> Like
                </div>
                <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold hover:text-white transition-colors cursor-pointer">
                    <MessageCircle className="w-4 h-4" /> Comment
                </div>
                <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold hover:text-white transition-colors cursor-pointer">
                    <RefreshCw className="w-4 h-4" /> Repost
                </div>
                <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold hover:text-white transition-colors cursor-pointer">
                    <Send className="w-4 h-4" /> Send
                </div>
            </div>
        </div>
    );

    // --- OTHER PLATFORMS ---
    // --- TWITTER GRID ---
    const renderTwitterMedia = () => {
        const count = previewUrls.length;
        if (count === 0) {
            return (
                <div className="h-40 bg-zinc-900/30 rounded-xl border border-dashed border-white/5 flex items-center justify-center">
                    <Twitter className="w-8 h-8 text-zinc-800" />
                </div>
            );
        }
        if (count === 1) {
            return (
                <div className="rounded-xl border border-white/10 overflow-hidden max-h-96">
                    <img src={previewUrls[0]} alt="Post" className="w-full h-full object-cover" />
                </div>
            );
        }
        if (count === 2) {
            return (
                <div className="grid grid-cols-2 gap-0.5 rounded-xl border border-white/10 overflow-hidden aspect-[1.75/1]">
                    <img src={previewUrls[0]} className="w-full h-full object-cover" alt="" />
                    <img src={previewUrls[1]} className="w-full h-full object-cover" alt="" />
                </div>
            );
        }
        if (count === 3) {
            return (
                <div className="grid grid-cols-2 gap-0.5 rounded-xl border border-white/10 overflow-hidden aspect-[1.75/1]">
                    <div className="row-span-2 relative">
                        <img src={previewUrls[0]} className="absolute inset-0 w-full h-full object-cover" alt="" />
                    </div>
                    <div className="h-full relative">
                        <img src={previewUrls[1]} className="absolute inset-0 w-full h-full object-cover" alt="" />
                    </div>
                    <div className="h-full relative">
                        <img src={previewUrls[2]} className="absolute inset-0 w-full h-full object-cover" alt="" />
                    </div>
                </div>
            );
        }
        // 4 images (Twitter max display)
        return (
            <div className="grid grid-cols-2 gap-0.5 rounded-xl border border-white/10 overflow-hidden aspect-[1.75/1]">
                <img src={previewUrls[0]} className="w-full h-full object-cover" alt="" />
                <img src={previewUrls[1]} className="w-full h-full object-cover" alt="" />
                <img src={previewUrls[2]} className="w-full h-full object-cover" alt="" />
                <div className="relative">
                    <img src={previewUrls[3]} className="w-full h-full object-cover" alt="" />
                    {count > 4 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-xl font-bold text-white">+{count - 4}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderTwitter = () => (
        <div className="bg-black border border-white/10 rounded-2xl overflow-hidden max-w-md mx-auto shadow-2xl p-4 flex gap-3 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 border border-white/5">
                <User className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-white">Astute AI</span>
                        <span className="text-zinc-500 text-sm">@astuteai • 1m</span>
                    </div>
                    <MoreHorizontal className="w-4 h-4 text-zinc-500" />
                </div>
                <div className="text-sm text-zinc-200 whitespace-pre-wrap leading-normal">
                    {caption}
                    <div className="text-[#1d9bf0] mt-2">
                        {hashtagArray.map(tag => (tag.startsWith('#') ? tag : `#${tag}`)).join(' ')}
                    </div>
                </div>
                {renderTwitterMedia()}
                <div className="flex justify-between items-center text-zinc-500 pt-1 pr-6 max-w-xs">
                    <MessageCircle className="w-4 h-4 hover:text-[#1d9bf0] transition-colors cursor-pointer" />
                    <RefreshCw className="w-4 h-4 hover:text-[#00ba7c] transition-colors cursor-pointer" />
                    <Heart className="w-4 h-4 hover:text-[#f91880] transition-colors cursor-pointer" />
                    <Upload className="w-4 h-4 hover:text-[#1d9bf0] transition-colors cursor-pointer" />
                </div>
            </div>
        </div>
    );

    // --- THREADS CAROUSEL ---
    const renderThreadsMedia = () => {
        const count = previewUrls.length;
        if (count === 0) {
            return (
                <div className="h-40 bg-zinc-900/30 rounded-xl border border-dashed border-white/5 flex items-center justify-center">
                    <ThreadsIcon className="w-8 h-8 text-zinc-800" />
                </div>
            );
        }

        // Threads uses carousel for multiple images
        return (
            <div className="relative group rounded-xl border border-white/10 overflow-hidden bg-zinc-900">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="aspect-[4/5] w-full"
                    >
                        <img src={previewUrls[activeIndex % count]} className="w-full h-full object-cover" alt="" />
                    </motion.div>
                </AnimatePresence>

                {count > 1 && (
                    <>
                        {/* Navigation Arrows */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveIndex(prev => (prev - 1 + count) % count);
                            }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveIndex(prev => (prev + 1) % count);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>

                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 items-center bg-black/40 backdrop-blur-sm px-2 py-1.5 rounded-full z-10">
                            {previewUrls.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveIndex(i);
                                    }}
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeIndex % count ? "bg-white scale-110" : "bg-white/40 hover:bg-white/60"}`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    };

    const renderThreads = () => (
        <div className="bg-[#101010] border border-white/10 rounded-2xl overflow-hidden max-w-md mx-auto shadow-2xl p-4 flex gap-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 border border-white/5">
                    <User className="w-6 h-6 text-zinc-500" />
                </div>
                <div className="w-0.5 flex-1 bg-zinc-800 rounded-full my-1" />
                <div className="w-4 h-4 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                </div>
            </div>
            <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-white">astute_user</span>
                        <span className="text-zinc-500 text-sm">1m</span>
                    </div>
                    <MoreHorizontal className="w-4 h-4 text-zinc-500" />
                </div>
                <div className="text-sm text-zinc-200 whitespace-pre-wrap leading-normal">
                    {caption}
                    <div className="text-zinc-500 mt-2">{hashtagString}</div>
                </div>
                {renderThreadsMedia()}
                <div className="flex items-center gap-4 text-white/80 pt-1">
                    <Heart className="w-5 h-5 hover:text-red-500 transition-colors cursor-pointer" />
                    <MessageCircle className="w-5 h-5 hover:text-zinc-400 transition-colors cursor-pointer" />
                    <RefreshCw className="w-5 h-5 hover:text-zinc-400 transition-colors cursor-pointer" />
                    <Send className="w-5 h-5 hover:text-zinc-400 transition-colors cursor-pointer" />
                </div>
            </div>
        </div>
    );

    // --- FACEBOOK COLLAGE ---
    const renderFacebookMedia = () => {
        const count = previewUrls.length;
        if (count === 0) {
            return (
                <div className="h-48 bg-zinc-900/50 rounded flex items-center justify-center border border-dashed border-white/5">
                    <Facebook className="w-10 h-10 text-zinc-800" />
                </div>
            );
        }
        if (count === 1) {
            return (
                <div className="border-y border-white/5 -mx-4">
                    <img src={previewUrls[0]} alt="Post" className="w-full h-auto object-cover max-h-[400px]" />
                </div>
            );
        }
        // Facebook grid is similar to LinkedIn but often uses a specific 1 top / 2 bottom or 2x2
        return (
            <div className="grid grid-cols-2 gap-1 -mx-4">
                <img src={previewUrls[0]} className={`w-full h-full object-cover ${count === 3 ? "col-span-2 aspect-[16/9]" : "aspect-square"}`} alt="" />
                {count >= 2 && <img src={previewUrls[1]} className="w-full h-full object-cover aspect-square" alt="" />}
                {count >= 3 && (
                    <div className="relative aspect-square">
                        <img src={previewUrls[2]} className="absolute inset-0 w-full h-full object-cover" alt="" />
                        {count > 3 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <span className="text-2xl font-bold text-white">+{count - 2}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderFacebook = () => (
        <div className="bg-[#242526] border border-white/10 rounded-xl overflow-hidden max-w-md mx-auto shadow-2xl p-4 space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/5">
                        <User className="w-6 h-6 text-zinc-500" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">Astute Member</span>
                        <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                            1 minute ago • <Facebook className="w-2.5 h-2.5" />
                        </span>
                    </div>
                </div>
                <MoreHorizontal className="w-5 h-5 text-zinc-400" />
            </div>
            <div className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                {caption}
                <div className="text-[#4599ff] mt-2 font-medium">{hashtagString}</div>
            </div>
            {renderFacebookMedia()}
            <div className="pt-2 border-t border-white/5 flex items-center justify-around">
                <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold py-2 px-6 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                    <Heart className="w-4 h-4" /> Like
                </div>
                <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold py-2 px-6 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                    <MessageCircle className="w-4 h-4" /> Comment
                </div>
                <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold py-2 px-6 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                    <Share2 className="w-4 h-4" /> Share
                </div>
            </div>
        </div>
    );

    switch (platform) {
        case 'instagram': return renderInstagram();
        case 'linkedin': return renderLinkedin();
        case 'twitter': return renderTwitter();
        case 'threads': return renderThreads();
        case 'facebook': return renderFacebook();
        default: return renderInstagram();
    }
};

export default SocialPreview;
