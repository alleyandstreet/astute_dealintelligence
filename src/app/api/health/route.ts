import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
    try {
        await db.$queryRaw`SELECT 1`;
        return NextResponse.json(
            {
                status: "ok",
                database: "ok",
                timestamp: new Date().toISOString(),
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("Health check failed:", error);
        return NextResponse.json(
            {
                status: "degraded",
                database: "down",
                timestamp: new Date().toISOString(),
            },
            { status: 503 },
        );
    }
}
