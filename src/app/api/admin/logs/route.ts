import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActivityLogs } from "@/lib/activity-logger";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "super_admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId") || undefined;
        const action = searchParams.get("action") || undefined;
        const startDate = searchParams.get("startDate")
            ? new Date(searchParams.get("startDate")!)
            : undefined;
        const endDate = searchParams.get("endDate")
            ? new Date(searchParams.get("endDate")!)
            : undefined;
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");

        const result = await getActivityLogs({
            userId,
            action: action as any,
            startDate,
            endDate,
            limit,
            offset,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching activity logs:", error);
        return NextResponse.json(
            { error: "Failed to fetch activity logs" },
            { status: 500 }
        );
    }
}
