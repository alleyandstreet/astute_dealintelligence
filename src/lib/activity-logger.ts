import { db } from "./db";

export type ActivityAction =
    | "login"
    | "logout"
    | "deal_created"
    | "deal_updated"
    | "deal_deleted"
    | "scan_started"
    | "scan_completed"
    | "note_added"
    | "tag_added"
    | "user_created"
    | "user_updated"
    | "user_deleted";

interface LogActivityParams {
    userId: string;
    action: ActivityAction;
    details?: string;
    ipAddress?: string;
    userAgent?: string;
}

export async function logActivity({
    userId,
    action,
    details,
    ipAddress,
    userAgent,
}: LogActivityParams) {
    try {
        await db.activityLog.create({
            data: {
                userId,
                action,
                details,
                ipAddress,
                userAgent,
            },
        });
    } catch (error) {
        console.error("Failed to log activity:", error);
        // Don't throw - logging failures shouldn't break the app
    }
}

export async function getActivityLogs({
    userId,
    action,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
}: {
    userId?: string;
    action?: ActivityAction;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}) {
    const where: any = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
        db.activityLog.findMany({
            where,
            include: {
                user: {
                    select: {
                        username: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            take: limit,
            skip: offset,
        }),
        db.activityLog.count({ where }),
    ]);

    return { logs, total };
}
