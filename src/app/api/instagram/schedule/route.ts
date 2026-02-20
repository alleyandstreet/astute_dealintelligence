import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { caption, hashtags, scheduledFor, mediaFiles, platform, reminderEnabled } = body;

        // Retrieve user ID from session
        const userId = (session.user as any).id;

        if (!userId) {
            return NextResponse.json({ error: "User ID not found in session" }, { status: 400 });
        }

        // Validate
        if (!caption || !scheduledFor) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const scheduledDate = new Date(scheduledFor);
        if (isNaN(scheduledDate.getTime())) {
            return NextResponse.json({ error: "Invalid date" }, { status: 400 });
        }

        // Create the scheduled post
        const post = await db.scheduledPost.create({
            data: {
                caption,
                hashtags: Array.isArray(hashtags) ? hashtags : [],
                platform: platform || "instagram",
                scheduledFor: scheduledDate,
                userId: userId,
                status: "scheduled",
                mediaUrls: JSON.stringify(mediaFiles || []),
                reminderEnabled: !!reminderEnabled,
            },
        });

        return NextResponse.json({ success: true, post });

    } catch (error) {
        console.error("Scheduling error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
