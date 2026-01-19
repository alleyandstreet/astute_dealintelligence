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
        // 1. Deal Status Distribution
        const dealsByStatus = await db.deal.groupBy({
            by: ['status'],
            _count: {
                id: true
            }
        });

        // 2. Weekly Scan Trends
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);

        const recentScans = await db.scanLog.findMany({
            where: {
                startedAt: {
                    gte: last7Days
                }
            },
            orderBy: {
                startedAt: 'desc'
            },
            take: 10
        });

        // 3. User Activity Radar (top active users)
        const topUsers = await db.activityLog.groupBy({
            by: ['userId'],
            _count: {
                id: true
            },
            orderBy: {
                _count: {
                    id: 'desc'
                }
            },
            take: 5
        });

        // Fetch user names for the top users
        const usersWithNames = await Promise.all(topUsers.map(async (u) => {
            const user = await db.user.findUnique({
                where: { id: u.userId },
                select: { username: true }
            });
            return {
                username: user?.username || "Unknown",
                count: u._count.id
            };
        }));

        // 4. Financial Summary
        const financialAgg = await db.deal.aggregate({
            _avg: {
                revenue: true,
                valuationMin: true,
            },
            _sum: {
                valuationMin: true
            }
        });

        return NextResponse.json({
            dealsByStatus,
            recentScans,
            topUsers: usersWithNames,
            financials: financialAgg
        });
    } catch (error) {
        console.error("Error fetching analytics:", error);
        return NextResponse.json(
            { error: "Failed to fetch analytics" },
            { status: 500 }
        );
    }
}
