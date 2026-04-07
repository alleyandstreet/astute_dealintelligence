import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { toStringArray } from "@/lib/json-arrays";

export async function GET(req: NextRequest) {
    const { session, response } = await requireAuth({
        feature: "content_engine",
        rateLimitKey: "content_engine_requests",
    });
    if (response) return response;

    try {
        const userId = (session?.user as any)?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const posts = await db.scheduledPost.findMany({
            where: { userId: userId },
            orderBy: { scheduledFor: 'asc' },
        });

        return NextResponse.json(
            posts.map((post) => ({
                ...post,
                hashtags: toStringArray(post.hashtags),
            }))
        );
    } catch (error) {
        console.error("Calendar fetch error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
