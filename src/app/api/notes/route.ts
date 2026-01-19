import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

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
        });

        return NextResponse.json(notes);
    } catch (error) {
        console.error("Error fetching notes:", error);
        return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
    }
}

// POST - Create new note
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { dealId, content } = body;

        if (!dealId || !content) {
            return NextResponse.json({ error: "Deal ID and content required" }, { status: 400 });
        }

        const note = await db.note.create({
            data: {
                dealId,
                content,
            },
        });

        return NextResponse.json(note, { status: 201 });
    } catch (error) {
        console.error("Error creating note:", error);
        return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
    }
}

// DELETE - Remove note
export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Note ID required" }, { status: 400 });
        }

        await db.note.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting note:", error);
        return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
    }
}
