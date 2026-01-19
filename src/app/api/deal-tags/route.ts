import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// POST - Add tag to deal
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { dealId, tagId } = body;

        if (!dealId || !tagId) {
            return NextResponse.json({ error: "Deal ID and Tag ID required" }, { status: 400 });
        }

        // Check if already tagged
        const existing = await db.dealTag.findFirst({
            where: { dealId, tagId },
        });

        if (existing) {
            return NextResponse.json({ error: "Tag already added" }, { status: 400 });
        }

        const dealTag = await db.dealTag.create({
            data: { dealId, tagId },
            include: { tag: true },
        });

        return NextResponse.json(dealTag, { status: 201 });
    } catch (error) {
        console.error("Error adding tag to deal:", error);
        return NextResponse.json({ error: "Failed to add tag" }, { status: 500 });
    }
}

// DELETE - Remove tag from deal
export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const dealId = searchParams.get("dealId");
        const tagId = searchParams.get("tagId");

        if (!dealId || !tagId) {
            return NextResponse.json({ error: "Deal ID and Tag ID required" }, { status: 400 });
        }

        await db.dealTag.deleteMany({
            where: { dealId, tagId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error removing tag from deal:", error);
        return NextResponse.json({ error: "Failed to remove tag" }, { status: 500 });
    }
}
