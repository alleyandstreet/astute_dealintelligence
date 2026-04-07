import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { toUniqueStringArray } from "@/lib/json-arrays";

export async function POST(req: NextRequest) {
    try {
        const { session, response } = await requireAuth();
        if (response) return response;

        const user = await db.user.findFirst({
            where: { email: session!.user!.email! },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await req.json();
        const { caption, hashtags, mediaUrls, platform } = body;
        const normalizedHashtags = toUniqueStringArray(hashtags);

        // Create a temporary handoff post
        const post = await db.scheduledPost.create({
            data: {
                caption: caption || "",
                hashtags: normalizedHashtags,
                platform: platform || "instagram",
                scheduledFor: new Date(), // Immediate for handoff
                userId: user.id,
                status: "handoff",
                mediaUrls: JSON.stringify(mediaUrls || []),
            },
        });

        return NextResponse.json({ success: true, id: post.id });

    } catch (error: any) {
        console.error("Handoff save error:", error);
        return NextResponse.json({
            error: "Internal Server Error",
            message: "Failed to save handoff data"
        }, { status: 500 });
    }
}
