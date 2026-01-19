import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "super_admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const configs = await db.searchConfig.findMany({
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ configs });
    } catch (error) {
        console.error("Error fetching configs:", error);
        return NextResponse.json(
            { error: "Failed to fetch scan configurations" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "super_admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, subreddits, keywords, isDefault } = body;

        if (isDefault) {
            await db.searchConfig.updateMany({
                where: { isDefault: true },
                data: { isDefault: false }
            });
        }

        const config = await db.searchConfig.create({
            data: {
                name,
                subreddits,
                keywords,
                isDefault: isDefault || false,
            }
        });

        return NextResponse.json({ config });
    } catch (error) {
        console.error("Error creating config:", error);
        return NextResponse.json(
            { error: "Failed to create configuration" },
            { status: 500 }
        );
    }
}
