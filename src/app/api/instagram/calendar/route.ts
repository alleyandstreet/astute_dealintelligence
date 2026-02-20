import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const posts = await db.scheduledPost.findMany({
            where: { userId: userId },
            orderBy: { scheduledFor: 'asc' },
        });

        // Ensure dates are serialized correctly for JSON
        return NextResponse.json(posts);
    } catch (error) {
        console.error("Calendar fetch error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
