import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { toUniqueStringArray } from "@/lib/json-arrays";

export async function POST(req: NextRequest) {
    const { session, response } = await requireAuth({
        feature: "content_engine",
        rateLimitKey: "content_engine_requests",
    });
    if (response) return response;

    try {
        const body = await req.json();
        const { caption, hashtags, scheduledFor, mediaFiles, platform, reminderEnabled } = body;
        const normalizedHashtags = toUniqueStringArray(hashtags);

        // Retrieve user ID from session
        const userId = (session.user as any).id;

        if (!userId) {
            return NextResponse.json({ error: "User ID not found in session" }, { status: 400 });
        }

        // Validate: Need either caption or media, and always need a scheduled date
        if ((!caption && (!mediaFiles || mediaFiles.length === 0)) || !scheduledFor) {
            return NextResponse.json({ error: "Missing required fields (need either caption or media, and a date)" }, { status: 400 });
        }

        const scheduledDate = new Date(scheduledFor);
        if (isNaN(scheduledDate.getTime())) {
            return NextResponse.json({ error: "Invalid date" }, { status: 400 });
        }

        // Create the scheduled post
        const post = await db.scheduledPost.create({
            data: {
                caption,
                hashtags: normalizedHashtags,
                platform: platform || "instagram",
                scheduledFor: scheduledDate,
                userId: userId,
                status: "scheduled",
                mediaUrls: JSON.stringify(mediaFiles || []),
                reminderEnabled: !!reminderEnabled,
            },
        });

        return NextResponse.json({ success: true, post: { ...post, hashtags: normalizedHashtags } });

    } catch (error) {
        console.error("Scheduling error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
