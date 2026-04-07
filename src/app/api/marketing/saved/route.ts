import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
    const { session, response } = await requireAuth({
        feature: "content_engine",
        rateLimitKey: "content_engine_requests",
    });
    if (response) return response;

    try {
        const { title, prompt, format, persona, blueprint, outline, thinking } = await req.json();

        const saved = await db.savedBlueprint.create({
            data: {
                title,
                prompt,
                format,
                persona,
                thinking,
                blueprint,
                outline,
                userId: (session.user as any).id
            }
        });

        return NextResponse.json(saved);
    } catch (error: any) {
        console.error("Save blueprint error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const { session, response } = await requireAuth({
        feature: "content_engine",
        rateLimitKey: "content_engine_requests",
    });
    if (response) return response;

    try {
        const saved = await db.savedBlueprint.findMany({
            where: { userId: (session.user as any).id },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(saved);
    } catch (error: any) {
        console.error("Fetch blueprints error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const { session, response } = await requireAuth({
        feature: "content_engine",
        rateLimitKey: "content_engine_requests",
    });
    if (response) return response;

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 });
        }

        await db.savedBlueprint.delete({
            where: {
                id,
                userId: (session.user as any).id // Security check
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete blueprint error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
