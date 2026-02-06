"use server";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { caption, hashtags, scheduledFor, mediaFiles, platform } = body;

        // Retrieve user ID from DB using email (safest way if session.user.id isn't populated)
        // Note: email is not unique in schema, so using findFirst
        const user = await db.user.findFirst({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
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
                userId: user.id,
                status: "scheduled",
                mediaUrls: JSON.stringify(mediaFiles || []),
            },
        });

        return NextResponse.json({ success: true, post });

    } catch (error) {
        console.error("Scheduling error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
