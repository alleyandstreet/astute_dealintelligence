import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";
import { NextRequest, NextResponse } from "next/server";

type SessionUser = {
    id?: string;
    role?: string;
};

function getDurationMinutes(clockInAt: Date, endAt: Date): number {
    const diff = Math.round((endAt.getTime() - clockInAt.getTime()) / 60000);
    return Math.max(1, diff);
}

function mapAttendanceRecord(
    session: {
        id: string;
        userId: string;
        clockInAt: Date;
        clockOutAt: Date | null;
        durationMinutes: number | null;
        user: { id: string; username: string; email: string | null; role: string };
    },
    now: Date
) {
    return {
        id: session.id,
        userId: session.userId,
        clockInAt: session.clockInAt.toISOString(),
        clockOutAt: session.clockOutAt ? session.clockOutAt.toISOString() : null,
        durationMinutes: session.durationMinutes ?? getDurationMinutes(session.clockInAt, session.clockOutAt ?? now),
        status: session.clockOutAt ? "closed" : ("active" as const),
        user: session.user,
    };
}

function getSessionUser(session: unknown): SessionUser {
    const maybeSession = session as { user?: SessionUser } | null;
    return maybeSession?.user || {};
}

export async function GET(request: NextRequest) {
    const { session, response } = await requireAuth({
        feature: "team_crm",
        rateLimitKey: "team_crm_requests",
    });
    if (response) return response;

    const now = new Date();
    const { searchParams } = new URL(request.url);
    const daysParam = Number(searchParams.get("days") || "30");
    const days = Number.isFinite(daysParam) ? Math.min(Math.max(Math.floor(daysParam), 1), 365) : 30;
    const rangeStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const currentUser = getSessionUser(session);

    try {
        const [interns, attendanceSessions] = await Promise.all([
            db.user.findMany({
                where: {
                    isActive: true,
                    role: "intern",
                },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    role: true,
                },
                orderBy: { username: "asc" },
            }),
            db.internAttendance.findMany({
                where: {
                    OR: [
                        { clockInAt: { gte: rangeStart } },
                        { clockOutAt: null },
                    ],
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            role: true,
                        },
                    },
                },
                orderBy: { clockInAt: "desc" },
                take: 500,
            }),
        ]);

        const records = attendanceSessions.map((sessionItem) => mapAttendanceRecord(sessionItem, now));
        const recordsByUserId = new Map<string, typeof records>();

        for (const record of records) {
            const bucket = recordsByUserId.get(record.userId) || [];
            bucket.push(record);
            recordsByUserId.set(record.userId, bucket);
        }

        const internsWithSummary = interns.map((intern) => {
            const internRecords = recordsByUserId.get(intern.id) || [];
            const todayMinutes = internRecords
                .filter((record) => new Date(record.clockInAt) >= todayStart)
                .reduce((sum, record) => sum + record.durationMinutes, 0);
            const weekMinutes = internRecords
                .filter((record) => new Date(record.clockInAt) >= weekStart)
                .reduce((sum, record) => sum + record.durationMinutes, 0);
            const rangeMinutes = internRecords.reduce((sum, record) => sum + record.durationMinutes, 0);
            const activeSession = internRecords.find((record) => record.status === "active") || null;

            return {
                ...intern,
                activeSession,
                totalSessions: internRecords.length,
                todayMinutes,
                weekMinutes,
                rangeMinutes,
            };
        });

        const activeSessionForCurrentUser =
            records.find((record) => record.userId === currentUser.id && record.status === "active") || null;

        const trackedTodayMinutes = records
            .filter((record) => new Date(record.clockInAt) >= todayStart)
            .reduce((sum, record) => sum + record.durationMinutes, 0);

        return NextResponse.json({
            generatedAt: now.toISOString(),
            currentUserId: currentUser.id || null,
            currentUserRole: currentUser.role || null,
            canClock: currentUser.role === "intern",
            activeSession: activeSessionForCurrentUser,
            summary: {
                trackedTodayMinutes,
                activeInterns: internsWithSummary.filter((intern) => Boolean(intern.activeSession)).length,
                totalSessions: records.length,
            },
            interns: internsWithSummary,
            records: records.slice(0, 200),
        });
    } catch (error) {
        console.error("CRM attendance fetch error:", error);
        return NextResponse.json({ error: "Failed to load attendance records" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const { session, response } = await requireAuth({
        feature: "team_crm",
        rateLimitKey: "team_crm_requests",
    });
    if (response) return response;

    const currentUser = getSessionUser(session);
    const userId = currentUser.id;
    const role = String(currentUser.role || "").toLowerCase();

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (role !== "intern") {
        return NextResponse.json({ error: "Clock in/out is available for intern accounts only" }, { status: 403 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const action = String((body as { action?: string }).action || "").toLowerCase().trim();
        if (!["clock_in", "clock_out"].includes(action)) {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        const now = new Date();
        const openSession = await db.internAttendance.findFirst({
            where: {
                userId,
                clockOutAt: null,
            },
            orderBy: {
                clockInAt: "desc",
            },
        });

        if (action === "clock_in") {
            if (openSession) {
                return NextResponse.json(
                    {
                        error: "You are already clocked in",
                        openSession,
                    },
                    { status: 409 }
                );
            }

            const created = await db.internAttendance.create({
                data: {
                    userId,
                    clockInAt: now,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            role: true,
                        },
                    },
                },
            });

            await logActivity({
                userId,
                action: "intern_clock_in",
                details: `Clocked in at ${created.clockInAt.toISOString()}`,
                ipAddress: request.headers.get("x-forwarded-for") || undefined,
            });

            return NextResponse.json(mapAttendanceRecord(created, now), { status: 201 });
        }

        if (!openSession) {
            return NextResponse.json({ error: "No active clock-in session found" }, { status: 404 });
        }

        const durationMinutes = getDurationMinutes(openSession.clockInAt, now);
        const updated = await db.internAttendance.update({
            where: { id: openSession.id },
            data: {
                clockOutAt: now,
                durationMinutes,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });

        await logActivity({
            userId,
            action: "intern_clock_out",
            details: `Clocked out at ${updated.clockOutAt?.toISOString() || now.toISOString()}`,
            ipAddress: request.headers.get("x-forwarded-for") || undefined,
        });

        return NextResponse.json(mapAttendanceRecord(updated, now));
    } catch (error) {
        console.error("CRM attendance update error:", error);
        return NextResponse.json({ error: "Failed to update attendance status" }, { status: 500 });
    }
}
