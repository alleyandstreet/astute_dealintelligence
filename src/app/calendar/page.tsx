import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
    Clock,
    Calendar as CalendarIcon,
    ImageIcon,
    Film,
    CheckCircle2,
    AlertCircle,
    MoreHorizontal,
    Sparkles,
    Filter
} from "lucide-react";

import Link from "next/link";
import CalendarGrid from "@/components/CalendarGrid";

export const metadata = {
    title: "Content Calendar | Astute",
    description: "Manage your scheduled social media content.",
};

export default async function ContentCalendar() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) redirect("/login");

    const user = await db.user.findFirst({
        where: { email: session.user.email }
    });

    if (!user) redirect("/login");

    const posts = await db.scheduledPost.findMany({
        where: { userId: user.id },
        orderBy: { scheduledFor: 'asc' },
    });

    // Stats calculation
    const totalPosts = posts.length;
    const pendingPosts = posts.filter(p => p.status === 'scheduled').length;
    const postedPosts = posts.filter(p => p.status === 'posted').length;

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Content Command Center</h1>
                    <p className="text-zinc-400 mt-1">Orchestrate your social media presence from one place.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/marketing"
                        className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-pink-900/20 transition-all flex items-center gap-2"
                    >
                        <Sparkles className="w-4 h-4" />
                        Create New
                    </Link>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#111] border border-white/5 p-5 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <CalendarIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Total Scheduled</p>
                        <h3 className="text-2xl font-bold text-white">{totalPosts}</h3>
                    </div>
                </div>
                <div className="bg-[#111] border border-white/5 p-5 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Pending</p>
                        <h3 className="text-2xl font-bold text-white">{pendingPosts}</h3>
                    </div>
                </div>
                <div className="bg-[#111] border border-white/5 p-5 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Published</p>
                        <h3 className="text-2xl font-bold text-white">{postedPosts}</h3>
                    </div>
                </div>
            </div>

            {/* Filters & Grid */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-pink-500" />
                        Timeline
                    </h2>
                    <button className="text-sm text-zinc-500 hover:text-white flex items-center gap-2 transition-colors">
                        <Filter className="w-4 h-4" /> Filters
                    </button>
                </div>

                {posts.length === 0 ? (
                    <div className="text-center py-32 border border-dashed border-zinc-800 rounded-3xl bg-[#0a0a0a] flex flex-col items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-zinc-900/50 flex items-center justify-center mb-6">
                            <Sparkles className="w-10 h-10 text-zinc-700" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">No content scheduled yet</h3>
                        <p className="text-zinc-500 max-w-md mx-auto mb-8">
                            Your calendar is empty. Head over to the Architect to generate amazing captions and schedule your first post.
                        </p>
                        <Link
                            href="/marketing"
                            className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-zinc-200 transition-colors"
                        >
                            Start Creating
                        </Link>
                    </div>
                ) : (
                    <CalendarGrid initialPosts={posts.map(p => ({
                        ...p,
                        scheduledFor: p.scheduledFor.toISOString(), // Serialize date for client component
                        mediaUrls: p.mediaUrls // Pass string directly, parsed in component
                    }))} />
                )}
            </div>
        </div>
    );
}

