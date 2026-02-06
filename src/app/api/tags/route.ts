import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";

// GET all tags
export async function GET() {
    try {
        const tags = await db.tag.findMany({
            include: {
                _count: {
                    select: { deals: true },
                },
            },
            orderBy: { name: "asc" },
        });

        return NextResponse.json(tags);
    } catch (error) {
        console.error("Error fetching tags:", error);
        return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
    }
}

// POST - Create new tag
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, color } = body;

        if (!name) {
            return NextResponse.json({ error: "Tag name required" }, { status: 400 });
        }

        // Check if tag already exists
        const existing = await db.tag.findUnique({
            where: { name },
        });

        if (existing) {
            return NextResponse.json({ error: "Tag already exists" }, { status: 400 });
        }

        const tag = await db.tag.create({
            data: {
                name,
                color: color || "#06b6d4",
            },
        });

        const session = await getServerSession(authOptions);
        if (session?.user) {
            await logActivity({
                userId: (session.user as any).id,
                action: "tag_created",
                details: `Created new global tag: ${name}`,
                ipAddress: request.headers.get("x-forwarded-for") || undefined,
            });
        }

        return NextResponse.json(tag, { status: 201 });
    } catch (error) {
        console.error("Error creating tag:", error);
        return NextResponse.json({ error: "Failed to create tag" }, { status: 500 });
    }
}

// DELETE - Remove tag
export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Tag ID required" }, { status: 400 });
        }

        await db.tag.delete({
            where: { id },
        });

        const session = await getServerSession(authOptions);
        if (session?.user) {
            await logActivity({
                userId: (session.user as any).id,
                action: "tag_deleted",
                details: `Deleted global tag ID: ${id}`,
                ipAddress: request.headers.get("x-forwarded-for") || undefined,
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting tag:", error);
        return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 });
    }
}
