import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import os from "os";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "super_admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Gathering system stats
        const userCount = await db.user.count();
        const businessCount = await db.business.count();
        const dealCount = await db.deal?.count() || 0;
        const logCount = await db.activityLog.count();

        const systemInfo = {
            platform: process.platform,
            nodeVersion: process.version,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            cpuCount: os.cpus().length,
            loadAvg: os.loadavg(),
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
        };

        const databaseInfo = {
            provider: "SQLite",
            userCount,
            businessCount,
            dealCount,
            logCount,
        };

        return NextResponse.json({
            system: systemInfo,
            database: databaseInfo,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error fetching system info:", error);
        return NextResponse.json(
            { error: "Failed to fetch system info" },
            { status: 500 }
        );
    }
}
