import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";

type SessionUser = {
    id?: string;
    name?: string | null;
};

function withResolvedAuthor<T extends { authorName: string | null; user: { username: string } | null }>(note: T) {
    return {
        ...note,
        authorName: note.authorName ?? note.user?.username ?? "Unknown",
    };
}

// GET notes for a deal
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const dealId = searchParams.get("dealId");

        if (!dealId) {
            return NextResponse.json({ error: "Deal ID required" }, { status: 400 });
        }

        const notes = await db.note.findMany({
            where: { dealId },
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
        });

        return NextResponse.json(notes.map(withResolvedAuthor));
    } catch (error) {
        console.error("Error fetching notes:", error);
        return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
    }
}

// POST - Create new note
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const sessionUser = session?.user as SessionUser | undefined;
        if (!sessionUser?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const dealId = String(body.dealId ?? "");
        const content = String(body.content ?? "").trim();

        if (!dealId || !content) {
            return NextResponse.json({ error: "Deal ID and content required" }, { status: 400 });
        }

        const user = await db.user.findUnique({
            where: { id: sessionUser.id },
            select: { username: true },
        });

        const userId = user ? sessionUser.id : null;
        const authorName = user?.username ?? sessionUser.name ?? "Unknown";

        const note = await db.note.create({
            data: {
                dealId,
                content,
                userId,
                authorName,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
        });

        await logActivity({
            userId: sessionUser.id,
            action: "note_added",
            details: `Added note to deal ID: ${dealId}`,
            ipAddress: request.headers.get("x-forwarded-for") || undefined,
        });

        return NextResponse.json(withResolvedAuthor(note), { status: 201 });
    } catch (error) {
        console.error("Error creating note:", error);
        return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
    }
}

// DELETE - Remove note
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const sessionUser = session?.user as SessionUser | undefined;
        if (!sessionUser?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Note ID required" }, { status: 400 });
        }

        await db.note.delete({
            where: { id },
        });

        await logActivity({
            userId: sessionUser.id,
            action: "note_deleted",
            details: `Deleted note ID: ${id}`,
            ipAddress: request.headers.get("x-forwarded-for") || undefined,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting note:", error);
        return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
    }
}
