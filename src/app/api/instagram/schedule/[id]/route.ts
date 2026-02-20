import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const params = await context.params;
        const { id } = params;

        // Verify ownership
        const post = await db.scheduledPost.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        if (post.user.email !== session.user.email) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await db.scheduledPost.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
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
        return NextResponse.json(post);
    } catch (error) {
        console.error("Fetch error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const params = await context.params;
        const { id } = params;
        const body = await req.json();

        // Verify ownership
        const post = await db.scheduledPost.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        if (post.user.email !== session.user.email) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const updatedPost = await db.scheduledPost.update({
            where: { id },
            data: {
                caption: body.caption,
                hashtags: body.hashtags,
                scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
                status: body.status
            }
        });

        return NextResponse.json({ success: true, post: updatedPost });
    } catch (error) {
        console.error("Update error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
