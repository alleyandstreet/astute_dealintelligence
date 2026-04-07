import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { toStringArray, toUniqueStringArray } from "@/lib/json-arrays";

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { session, response } = await requireAuth({
        feature: "content_engine",
        rateLimitKey: "content_engine_requests",
    });
    if (response) return response;

    try {
        const userId = (session?.user as any)?.id;

        const params = await context.params;
        const targetId = params.id;

        console.log("[DELETE] Request for ID:", targetId);
        console.log("[DELETE] User ID from session:", userId);

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized: No user ID in session" }, { status: 401 });
        }

        // Verify ownership
        const post = await db.scheduledPost.findUnique({
            where: { id: targetId }
        });

        if (!post) {
            console.log("[DELETE] Post not found:", targetId);
            return NextResponse.json({ error: `Post not found: ${targetId}` }, { status: 404 });
        }

        console.log("[DELETE] Found post. Owner ID:", post.userId);

        if (post.userId !== userId) {
            console.log("[DELETE] Forbidden: Post owner is", post.userId, "but requester is", userId);
            return NextResponse.json({ error: "Forbidden: You do not own this post" }, { status: 403 });
        }

        await db.scheduledPost.delete({
            where: { id: targetId }
        });

        console.log("[DELETE] Successfully deleted post:", targetId);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete error details:", error);
        return NextResponse.json({ error: `Internal Server Error: ${error?.message || "Unknown error"}` }, { status: 500 });
    }
}

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const { id } = params;

        const post = await db.scheduledPost.findUnique({
            where: { id },
        });

        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        // Allow public access for "handoff" posts or if it's a valid ID
        // (Removing session check here to enable phone scanning without login)
        return NextResponse.json({
            ...post,
            hashtags: toStringArray(post.hashtags),
        });
    } catch (error) {
        console.error("Fetch error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
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

        const params = await context.params;
        const { id } = params;
        const body = await req.json();

        // Verify ownership
        const post = await db.scheduledPost.findUnique({
            where: { id }
        });

        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        if (post.userId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const updatedPost = await db.scheduledPost.update({
            where: { id },
            data: {
                caption: body.caption,
                hashtags: toUniqueStringArray(body.hashtags),
                scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
                status: body.status
            }
        });

        return NextResponse.json({
            success: true,
            post: {
                ...updatedPost,
                hashtags: toStringArray(updatedPost.hashtags),
            },
        });
    } catch (error) {
        console.error("Update error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
