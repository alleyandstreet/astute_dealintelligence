"use client";

import React, { useState } from "react";
import {
    Clock,
    ImageIcon,
    Film,
    CheckCircle2,
    AlertCircle,
    MoreHorizontal,
    Download,
    Edit3,
    Save,
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    LayoutGrid,
    List,
    Sparkles,
    X,
    Trash2,
    Loader2,
    Copy,
    Smartphone
} from "lucide-react";
import Link from "next/link";
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday
} from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Instagram, Twitter, AtSign, Facebook, Linkedin } from "lucide-react";
import ClientCopyButton from "./ClientCopyButton";
import DateTimePicker from "@/components/DateTimePicker";
import { QuickPostActionCenter } from "./QuickPostActionCenter";

interface Post {
    id: string;
    caption: string;
    hashtags: string[];
    scheduledFor: Date | string;
    status: string;
    mediaUrls: string;
    platform: string;
}

interface CalendarGridProps {
    initialPosts: Post[];
}

export default function CalendarGrid({ initialPosts }: CalendarGridProps) {
    const router = useRouter();
    const [posts, setPosts] = useState(initialPosts);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    // Edit State
    const [editCaption, setEditCaption] = useState("");
    const [editHashtags, setEditHashtags] = useState("");
    const [editDate, setEditDate] = useState<Date | null>(null);

    // Filter & Sort State
    const [filterPlatform, setFilterPlatform] = useState<string>("all");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [viewMode, setViewMode] = useState<"timeline" | "calendar">("calendar");
    const [viewDate, setViewDate] = useState(new Date());

    const filteredPosts = posts
        .filter(p => filterPlatform === "all" || p.platform === filterPlatform)
        .sort((a, b) => {
            const dateA = new Date(a.scheduledFor).getTime();
            const dateB = new Date(b.scheduledFor).getTime();
            return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
        });

    // Calendar logic
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const getPostsForDay = (day: Date) => {
        return filteredPosts.filter(post => isSameDay(new Date(post.scheduledFor), day));
    };

    const nextMonth = () => setViewDate(addMonths(viewDate, 1));
    const prevMonth = () => setViewDate(subMonths(viewDate, 1));
    const goToToday = () => setViewDate(new Date());

    const openPost = (post: Post) => {
        setSelectedPost(post);
        setEditCaption(post.caption);
        setEditHashtags(post.hashtags.join(" "));
        setEditDate(new Date(post.scheduledFor));
        setIsEditing(false);
        setCurrentMediaIndex(0);
        setIsConfirmingDelete(false);
    };

    const handleDelete = async () => {
        if (!selectedPost) return;
        if (!isConfirmingDelete) {
            setIsConfirmingDelete(true);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/instagram/schedule/${selectedPost.id}`, {
                method: "DELETE"
            });

            if (res.ok) {
                toast.success("Post deleted");
                setPosts(prev => prev.filter(p => p.id !== selectedPost.id));
                setSelectedPost(null);
                router.refresh();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to delete post");
            }
        } catch (e: any) {
            toast.error(e.message || "Error deleting post");
        } finally {
            setLoading(false);
        }
    };

    const getViewUrl = () => {
        if (!selectedPost) return "";
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        return `${baseUrl}/p/${selectedPost.id}`;
    };

    const handleUpdate = async () => {
        if (!selectedPost || !editDate) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/instagram/schedule/${selectedPost.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    caption: editCaption,
                    hashtags: editHashtags.split(" ").filter(t => t.startsWith("#")), // basic filter
                    scheduledFor: editDate.toISOString(),
                })
            });

            if (res.ok) {
                const data = await res.json();
                toast.success("Post updated");

                // Update local state
                setPosts(prev => prev.map(p => p.id === selectedPost.id ? {
                    ...p,
                    caption: editCaption,
                    hashtags: editHashtags.split(" "),
                    scheduledFor: editDate
                } : p));

                setSelectedPost(null);
                router.refresh();
            } else {
                toast.error("Failed to update post");
            }
        } catch (e) {
            toast.error("Error updating post");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Controls Bar */}
            <div className="flex flex-col xl:flex-row gap-6 justify-between items-center bg-[#0a0a0a]/80 backdrop-blur-2xl p-6 rounded-[2rem] border border-white/5 shadow-2xl">
                <div className="flex flex-col md:flex-row items-center gap-6 w-full xl:w-auto">
                    {/* View Switcher */}
                    <div className="flex bg-black/50 p-1 rounded-2xl border border-white/5 gap-0.5 shadow-inner">
                        <button
                            onClick={() => setViewMode("calendar")}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${viewMode === "calendar"
                                ? "bg-white text-black shadow-xl scale-[1.02]"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                                }`}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            Calendar
                        </button>
                        <button
                            onClick={() => setViewMode("timeline")}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${viewMode === "timeline"
                                ? "bg-white text-black shadow-xl scale-[1.02]"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                                }`}
                        >
                            <List className="w-3.5 h-3.5" />
                            Timeline
                        </button>
                    </div>

                    <div className="h-8 w-px bg-white/5 hidden md:block" />

                    {/* Platform Filter */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 max-w-2xl">
                        {["all", "instagram", "linkedin", "twitter", "threads", "facebook"].map((p) => (
                            <button
                                key={p}
                                onClick={() => setFilterPlatform(p)}
                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-300 border ${filterPlatform === p
                                    ? "bg-white text-black border-white shadow-lg shadow-white/10"
                                    : "bg-black/40 text-zinc-500 border-white/5 hover:border-white/10 hover:bg-white/5"
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-6 w-full xl:w-auto justify-center xl:justify-end">
                    {viewMode === "calendar" ? (
                        <div className="flex items-center bg-black/50 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                            <button
                                onClick={prevMonth}
                                className="p-2.5 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            <div className="px-6 min-w-[180px] text-center">
                                <span className="text-xs font-black text-white uppercase tracking-[0.25em]">
                                    {format(viewDate, "MMMM yyyy")}
                                </span>
                            </div>

                            <button
                                onClick={nextMonth}
                                className="p-2.5 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>

                            <div className="mx-1 h-6 w-px bg-white/5" />

                            <button
                                onClick={goToToday}
                                className="px-5 py-2.5 rounded-xl text-white text-[9px] font-black uppercase tracking-[0.2em] hover:bg-white/5 transition-all"
                            >
                                Today
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center bg-black/50 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                            <span className="pl-4 pr-3 text-[9px] text-zinc-600 font-black uppercase tracking-[0.2em]">Sort Order:</span>
                            <button
                                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                                className="px-5 py-2.5 rounded-xl bg-white/5 text-white text-[9px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all flex items-center gap-3 group"
                            >
                                {sortOrder === "asc" ? "Soonest" : "Latest"}
                                <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-300 ${sortOrder === 'asc' ? '-rotate-90' : 'rotate-90'}`} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Grid View (Calendar) */}
            {viewMode === "calendar" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        {/* Days of week header */}
                        <div className="grid grid-cols-7 border-b border-white/5 bg-white/[0.02]">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                                <div key={day} className="py-4 text-center text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7">
                            {calendarDays.map((day, idx) => {
                                const dayPosts = getPostsForDay(day);
                                const isCurrentMonth = isSameMonth(day, viewDate);
                                const isDayToday = isToday(day);

                                return (
                                    <div
                                        key={day.toString()}
                                        className={`min-h-[160px] p-4 border-r border-b border-white/5 transition-all relative group
                                            ${!isCurrentMonth ? "bg-black opacity-30" : "bg-[#0c0c0c]"}
                                            ${idx % 7 === 6 ? "border-r-0" : ""}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={`text-xs font-black tracking-tighter ${isDayToday
                                                ? "w-7 h-7 bg-white text-black rounded-full flex items-center justify-center -mt-1 -ml-1 scale-110 shadow-lg shadow-white/10"
                                                : isCurrentMonth ? "text-zinc-500" : "text-zinc-800"
                                                }`}>
                                                {format(day, "d")}
                                            </span>
                                            {dayPosts.length > 0 && (
                                                <div className="flex -space-x-1.5 overflow-hidden">
                                                    {dayPosts.slice(0, 3).map((p, i) => {
                                                        const pStyles: Record<string, string> = {
                                                            instagram: "bg-pink-500",
                                                            linkedin: "bg-blue-600",
                                                            twitter: "bg-sky-400",
                                                            threads: "bg-white",
                                                            facebook: "bg-blue-800"
                                                        };
                                                        return (
                                                            <div
                                                                key={p.id}
                                                                className={`w-2 h-2 rounded-full border border-black ${pStyles[p.platform?.toLowerCase()] || "bg-zinc-500"}`}
                                                                style={{ zIndex: 10 - i }}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2 max-h-[100px] overflow-y-auto no-scrollbar">
                                            {dayPosts.map(post => {
                                                const pIcons: Record<string, any> = {
                                                    instagram: Instagram,
                                                    linkedin: Linkedin,
                                                    twitter: Twitter,
                                                    threads: AtSign,
                                                    facebook: Facebook
                                                };
                                                const Icon = pIcons[post.platform?.toLowerCase()] || Sparkles;

                                                return (
                                                    <button
                                                        key={post.id}
                                                        onClick={() => openPost(post)}
                                                        className="w-full text-left p-2 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-white/20 transition-all group/post overflow-hidden"
                                                    >
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Icon className="w-2.5 h-2.5 text-zinc-500 group-hover/post:text-white transition-colors" />
                                                            <span className="text-[9px] font-black text-zinc-600 group-hover/post:text-zinc-400 transition-colors uppercase tracking-widest">
                                                                {format(new Date(post.scheduledFor), "h:mm a")}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-zinc-400 line-clamp-1 group-hover/post:text-white transition-colors leading-tight">
                                                            {post.caption}
                                                        </p>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Add indication of more posts */}
                                        {dayPosts.length === 0 && isCurrentMonth && (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link
                                                    href="/marketing"
                                                    className="p-2 rounded-full bg-white/5 border border-white/5 text-zinc-600 hover:text-white transition-colors"
                                                >
                                                    <Sparkles className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Timeline View */}
            {viewMode === "timeline" && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {filteredPosts.map((post) => {
                        let mediaUrls: string[] = [];
                        try {
                            mediaUrls = JSON.parse(post.mediaUrls);
                        } catch (e) {
                            if (post.mediaUrls && !post.mediaUrls.startsWith('[')) {
                                mediaUrls = [post.mediaUrls];
                            }
                        }

                        const isPosted = post.status === 'posted';
                        const isFailed = post.status === 'failed';

                        return (
                            <div
                                key={post.id}
                                onClick={() => openPost(post)}
                                className="group flex flex-col bg-[#111] border border-white/5 rounded-2xl overflow-hidden hover:border-pink-500/30 hover:shadow-[0_0_30px_rgba(236,72,153,0.1)] transition-all duration-300 cursor-pointer"
                            >
                                {/* Media Preview Section */}
                                <div className="aspect-[4/3] bg-black relative border-b border-white/5 overflow-hidden">
                                    {mediaUrls.length > 0 ? (
                                        <div className="w-full h-full relative group-hover:scale-105 transition-transform duration-500">
                                            {mediaUrls[0].endsWith('.mp4') || mediaUrls[0].endsWith('.mov') ? (
                                                <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                                    <Film className="w-12 h-12 text-zinc-700" />
                                                </div>
                                            ) : (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={mediaUrls[0]}
                                                    alt="Post media"
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-700">
                                            <ImageIcon className="w-12 h-12 opacity-20" />
                                        </div>
                                    )}

                                    {/* Badges Section */}
                                    <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-[30]">
                                        <div className={`backdrop-blur-xl px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border shadow-2xl ${isPosted
                                            ? "bg-green-500/80 border-green-400 text-white"
                                            : isFailed
                                                ? "bg-red-500/80 border-red-400 text-white"
                                                : "bg-blue-600/80 border-blue-400 text-white"
                                            }`}>
                                            {isPosted ? <CheckCircle2 className="w-3 h-3" /> : isFailed ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                            {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                                        </div>

                                        {(() => {
                                            const styles: Record<string, string> = {
                                                instagram: "bg-pink-600 border-pink-400 text-white shadow-pink-500/50",
                                                linkedin: "bg-blue-700 border-blue-500 text-white shadow-blue-500/50",
                                                twitter: "bg-sky-500 border-sky-400 text-white shadow-sky-500/50",
                                                threads: "bg-zinc-900 border-white/20 text-white shadow-white/10",
                                                facebook: "bg-blue-800 border-blue-600 text-white shadow-blue-800/50",
                                            };
                                            const platformKey = post.platform?.toLowerCase() || "instagram";
                                            const styleClass = styles[platformKey as keyof typeof styles] || "bg-zinc-800 border-white/10 text-white";

                                            return (
                                                <div className={`backdrop-blur-xl px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border shadow-lg transition-transform hover:scale-110 ${styleClass}`}>
                                                    {platformKey === 'instagram' && <Instagram className="w-3 h-3" />}
                                                    {platformKey === 'linkedin' && <Linkedin className="w-3 h-3" />}
                                                    {platformKey === 'twitter' && <Twitter className="w-3 h-3" />}
                                                    {platformKey === 'threads' && <AtSign className="w-3 h-3" />}
                                                    {platformKey === 'facebook' && <Facebook className="w-3 h-3" />}
                                                    {platformKey}
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                                        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium text-white border border-white/10">
                                            {format(new Date(post.scheduledFor), "MMM d, h:mm a")}
                                        </div>

                                        {mediaUrls.length > 1 && (
                                            <div className="bg-black/60 backdrop-blur-md px-2 py-1.5 rounded-lg text-xs font-bold text-white border border-white/10 flex items-center gap-1">
                                                <ImageIcon className="w-3 h-3" /> +{mediaUrls.length - 1}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Content Section */}
                                <div className="p-5 flex flex-col flex-1">
                                    <div className="flex-1 space-y-4">
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Caption</h4>
                                            <p className="text-zinc-300 text-sm line-clamp-3 leading-relaxed whitespace-pre-wrap font-sans">
                                                {post.caption}
                                            </p>
                                        </div>

                                        {post.hashtags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-2">
                                                {post.hashtags.slice(0, 4).map(tag => (
                                                    <span key={tag} className="text-[10px] text-pink-400/80 bg-pink-500/5 border border-pink-500/10 px-2 py-1 rounded-md">
                                                        {tag}
                                                    </span>
                                                ))}
                                                {post.hashtags.length > 4 && (
                                                    <span className="text-[10px] text-zinc-500 px-1 py-0.5">+{post.hashtags.length - 4} more</span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-white/5 flex gap-3">
                                        {/* Just showcase buttons here, real interaction in modal */}
                                        <div className="text-xs text-zinc-500 flex items-center gap-1 ml-auto">
                                            Click to manage <MoreHorizontal className="w-3 h-3" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}


            {/* POST DETAIL MODAL */}
            {
                selectedPost && (
                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200"
                        onClick={() => setSelectedPost(null)}
                    >
                        <div
                            className="bg-[#111] border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col md:flex-row relative animate-in zoom-in-95 duration-200"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setSelectedPost(null)}
                                className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* LEFT: Media Viewer */}
                            <div className="w-full md:w-1/2 bg-black flex items-center justify-center relative border-b md:border-b-0 md:border-r border-white/10 min-h-[400px]">
                                {(() => {
                                    let urls = [];
                                    try { urls = JSON.parse(selectedPost.mediaUrls); } catch (e) { urls = [selectedPost.mediaUrls]; }
                                    const url = urls[currentMediaIndex];

                                    return url ? (
                                        <div className="w-full h-full flex items-center justify-center relative group">
                                            {url.endsWith('.mp4') ? (
                                                <video src={url} controls className="max-w-full max-h-[80vh] w-auto h-auto" />
                                            ) : (
                                                <img src={url} alt={`Media ${currentMediaIndex + 1}`} className="max-w-full max-h-[80vh] w-auto h-auto object-contain" />
                                            )}

                                            {urls.length > 1 && (
                                                <>
                                                    <button
                                                        onClick={() => setCurrentMediaIndex((prev) => (prev - 1 + urls.length) % urls.length)}
                                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <ChevronLeft className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setCurrentMediaIndex((prev) => (prev + 1) % urls.length)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <ChevronRight className="w-5 h-5" />
                                                    </button>

                                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full">
                                                        {urls.map((_: string, i: number) => (
                                                            <div
                                                                key={i}
                                                                className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentMediaIndex ? "bg-white scale-125" : "bg-white/30"}`}
                                                            />
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-zinc-500 flex flex-col items-center">
                                            <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                                            <p>No media found</p>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* RIGHT: Details & Actions */}
                            <div className="w-full md:w-1/2 flex flex-col h-full max-h-[90vh]">
                                <div className="p-8 flex-1 overflow-y-auto">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-2 ${selectedPost.status === 'posted' ? "bg-green-500/20 border-green-500/30 text-green-400" :
                                            selectedPost.status === 'failed' ? "bg-red-500/20 border-red-500/30 text-red-400" :
                                                "bg-blue-500/20 border-blue-500/30 text-blue-400"
                                            }`}>
                                            {selectedPost.status.toUpperCase()}
                                        </div>
                                        {!isEditing && (
                                            <div className="text-sm text-zinc-400 font-medium">
                                                {format(new Date(selectedPost.scheduledFor), "PPP 'at' p")}
                                            </div>
                                        )}
                                    </div>

                                    {isEditing ? (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-zinc-500 uppercase">Caption</label>
                                                <textarea
                                                    value={editCaption}
                                                    onChange={e => setEditCaption(e.target.value)}
                                                    className="w-full h-40 bg-black/50 border border-white/10 rounded-xl p-4 text-zinc-200 focus:ring-1 focus:ring-pink-500/50 outline-none resize-none"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-zinc-500 uppercase">Hashtags</label>
                                                <textarea
                                                    value={editHashtags}
                                                    onChange={e => setEditHashtags(e.target.value)}
                                                    className="w-full h-24 bg-black/50 border border-white/10 rounded-xl p-4 text-zinc-200 focus:ring-1 focus:ring-pink-500/50 outline-none resize-none"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-zinc-500 uppercase">Reschedule</label>
                                                <DateTimePicker value={editDate} onChange={setEditDate} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Caption</h3>
                                                <p className="text-zinc-200 whitespace-pre-wrap leading-relaxed text-sm">
                                                    {selectedPost.caption}
                                                </p>
                                            </div>

                                            {selectedPost.hashtags.length > 0 && (
                                                <div className="space-y-2">
                                                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Hashtags</h3>
                                                    <div className="flex flex-wrap gap-2">
                                                        {selectedPost.hashtags.map(tag => (
                                                            <span key={tag} className="text-xs text-pink-400 bg-pink-500/10 px-2 py-1 rounded-md">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* QUICK-POST ACTION CENTER (v2 Enhancement) */}
                                {selectedPost && (
                                    <QuickPostActionCenter
                                        postId={selectedPost.id}
                                        caption={selectedPost.caption}
                                        hashtags={selectedPost.hashtags}
                                        platform={selectedPost.platform}
                                        currentMediaIndex={currentMediaIndex}
                                        mediaUrls={(() => {
                                            try { return JSON.parse(selectedPost.mediaUrls); }
                                            catch (e) { return [selectedPost.mediaUrls]; }
                                        })()}
                                    />
                                )}

                                {/* Footer Actions */}
                                <div className="p-6 border-t border-white/10 bg-[#0a0a0a] flex gap-3 flex-wrap">
                                    {isEditing ? (
                                        <>
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
                                                disabled={loading}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleUpdate}
                                                disabled={loading}
                                                className="flex-1 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-pink-900/20 flex items-center justify-center gap-2"
                                            >
                                                {loading ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                Save Changes
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-colors border border-white/5"
                                            >
                                                <Edit3 className="w-4 h-4 text-zinc-500" /> Edit Details
                                            </button>

                                            <div className="flex-1" />

                                            <button
                                                onClick={handleDelete}
                                                disabled={loading}
                                                className={`px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all border ${isConfirmingDelete
                                                    ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-900/20"
                                                    : "bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/10"
                                                    }`}
                                            >
                                                {loading ? <Clock className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                {isConfirmingDelete ? "Click again to confirm" : "Delete"}
                                            </button>

                                            {isConfirmingDelete && (
                                                <button
                                                    onClick={() => setIsConfirmingDelete(false)}
                                                    className="px-4 py-2 text-zinc-500 hover:text-white text-sm font-medium transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
