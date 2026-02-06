import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { action, details } = await req.json();

        // Get IP from headers (optional, good for security logs)
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        const userAgent = req.headers.get("user-agent") || "unknown";

        await logActivity({
            userId: (session.user as any).id,
            action,
            details,
            ipAddress: ip,
            userAgent,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Log activity error:", error);
        return NextResponse.json({ error: "Failed to log" }, { status: 500 });
    }
}
