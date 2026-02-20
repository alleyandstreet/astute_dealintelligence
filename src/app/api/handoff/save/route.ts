import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        let user: any = null;

        if (!session || !session.user || !session.user.email) {
            // Fallback for anonymous handoff (for bridge functionality)
            const firstUser = await db.user.findFirst();
            if (!firstUser) {
                return NextResponse.json({ error: "No user found in DB" }, { status: 500 });
            }
            user = firstUser;
        } else {
            user = await db.user.findFirst({
                where: { email: session.user.email },
            });
        }

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await req.json();
        const { caption, hashtags, mediaUrls, platform } = body;

        // Create a temporary handoff post
        const post = await db.scheduledPost.create({
            data: {
                caption: caption || "",
                hashtags: Array.isArray(hashtags) ? hashtags : [],
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
            message: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
