import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET all saved search configs
export async function GET() {
    console.log("DEBUG: GET /api/search-configs starting...");
    try {
        const configs = await db.searchConfig.findMany({
            orderBy: { createdAt: "desc" },
        });
        console.log(`DEBUG: Successfully fetched ${configs.length} configs`);
        return NextResponse.json(configs);
    } catch (error) {
        console.error("CRITICAL DEBUG: Error fetching search configs:", error);
        return NextResponse.json({ error: "Failed to fetch configs", details: String(error) }, { status: 500 });
    }
}

// POST - Create new search config
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, subreddits, keywords, isDefault } = body;

        if (!name || !subreddits) {
            return NextResponse.json({ error: "Name and subreddits required" }, { status: 400 });
        }

        // If setting as default, unset other defaults
        if (isDefault) {
            await db.searchConfig.updateMany({
                where: { isDefault: true },
                data: { isDefault: false },
            });
        }

        const config = await db.searchConfig.create({
            data: {
                name,
                subreddits: Array.isArray(subreddits) ? subreddits.join(",") : subreddits,
                keywords: Array.isArray(keywords) ? keywords.join(",") : keywords || "",
                isDefault: isDefault || false,
            },
        });

        return NextResponse.json(config, { status: 201 });
    } catch (error) {
        console.error("Error creating search config:", error);
        return NextResponse.json({ error: "Failed to create config" }, { status: 500 });
    }
}

// DELETE - Remove search config
export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Config ID required" }, { status: 400 });
        }

        await db.searchConfig.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting search config:", error);
        return NextResponse.json({ error: "Failed to delete config" }, { status: 500 });
    }
}
