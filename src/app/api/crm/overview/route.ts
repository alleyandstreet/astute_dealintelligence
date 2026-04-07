import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

const STATUSES = ["new_leads", "qualified", "contacted", "in_discussion", "due_diligence"] as const;

export async function GET() {
    const { session, response } = await requireAuth({
        feature: "team_crm",
        rateLimitKey: "team_crm_requests",
    });
    if (response) return response;

    const now = new Date();
    const staleCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const productivityWindow = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    try {
        const [deals, tasks, users, recentLogs] = await Promise.all([
            db.deal.findMany({
                select: {
                    id: true,
                    name: true,
                    status: true,
                    priority: true,
                    ownerId: true,
                    owner: { select: { id: true, username: true, email: true } },
                    createdAt: true,
                    updatedAt: true,
                    nextAction: true,
                    nextActionAt: true,
                    lastContactedAt: true,
                    revenue: true,
                    sourceName: true,
                },
                orderBy: { createdAt: "desc" },
            }),
            db.crmTask.findMany({
                include: {
                    assignedTo: { select: { id: true, username: true, email: true } },
                    createdBy: { select: { id: true, username: true, email: true } },
                    deal: { select: { id: true, name: true, status: true, priority: true } },
                },
                orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
                take: 300,
            }),
            db.user.findMany({
                where: { isActive: true },
                select: { id: true, username: true, email: true, role: true },
                orderBy: { createdAt: "asc" },
            }),
            db.activityLog.findMany({
                where: { createdAt: { gte: productivityWindow } },
                select: { userId: true, action: true },
            }),
        ]);

        const statusCounts = STATUSES.reduce<Record<string, number>>((acc, status) => {
            acc[status] = 0;
            return acc;
        }, {});

        for (const deal of deals) {
            statusCounts[deal.status] = (statusCounts[deal.status] || 0) + 1;
        }

        const unassignedDeals = deals.filter((deal) => !deal.ownerId);
        const highPriorityDeals = deals.filter((deal) => deal.priority === "high");
        const overdueTasks = tasks.filter((task) => task.status !== "done" && task.dueDate && new Date(task.dueDate) < now);
        const dueTodayTasks = tasks.filter((task) => {
            if (task.status === "done" || !task.dueDate) return false;
            const dueDate = new Date(task.dueDate);
            return dueDate >= todayStart && dueDate <= todayEnd;
        });
        const dueNext24hTasks = tasks.filter((task) => {
            if (task.status === "done" || !task.dueDate) return false;
            const dueDate = new Date(task.dueDate);
            return dueDate > now && dueDate <= next24Hours;
        });
        const blockedTasks = tasks.filter((task) => task.status === "blocked");
        const unassignedTasks = tasks.filter((task) => task.status !== "done" && !task.assignedToId);
        const staleDeals = deals
            .filter((deal) => {
                const overdueNextAction = deal.nextActionAt ? new Date(deal.nextActionAt) < now : false;
                const inactive = new Date(deal.updatedAt) < staleCutoff;
                return overdueNextAction || inactive;
            })
            .slice(0, 50);
        const dealsWithOwner = deals.filter((deal) => Boolean(deal.ownerId)).length;
        const dealsWithNextAction = deals.filter((deal) => Boolean((deal.nextAction || "").trim())).length;
        const overdueNextActions = deals.filter((deal) => deal.nextActionAt && new Date(deal.nextActionAt) < now).length;
        const dueTodayNextActions = deals.filter((deal) => {
            if (!deal.nextActionAt) return false;
            const nextActionAt = new Date(deal.nextActionAt);
            return nextActionAt >= todayStart && nextActionAt <= todayEnd;
        }).length;
        const criticalDeals = deals
            .map((deal) => {
                const signals: string[] = [];
                let riskScore = 0;
                const hasOwner = Boolean(deal.ownerId);
                const hasNextAction = Boolean((deal.nextAction || "").trim());
                const nextActionOverdue = Boolean(deal.nextActionAt && new Date(deal.nextActionAt) < now);
                const staleUpdate = new Date(deal.updatedAt) < staleCutoff;

                if (!hasOwner) {
                    signals.push("owner_missing");
                    riskScore += 3;
                }
                if (!hasNextAction) {
                    signals.push("next_action_missing");
                    riskScore += 2;
                }
                if (nextActionOverdue) {
                    signals.push("next_action_overdue");
                    riskScore += 3;
                }
                if (deal.priority === "high") {
                    signals.push("high_priority");
                    riskScore += 2;
                }
                if (staleUpdate) {
                    signals.push("stale_update");
                    riskScore += 1;
                }

                return {
                    id: deal.id,
                    name: deal.name,
                    status: deal.status,
                    priority: deal.priority,
                    ownerId: deal.ownerId,
                    owner: deal.owner,
                    nextAction: deal.nextAction,
                    nextActionAt: deal.nextActionAt,
                    updatedAt: deal.updatedAt,
                    sourceName: deal.sourceName,
                    riskScore,
                    signals,
                };
            })
            .filter((deal) => deal.signals.length > 0)
            .sort((a, b) => {
                if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
                const aDate = a.nextActionAt ? new Date(a.nextActionAt).getTime() : Number.POSITIVE_INFINITY;
                const bDate = b.nextActionAt ? new Date(b.nextActionAt).getTime() : Number.POSITIVE_INFINITY;
                return aDate - bDate;
            })
            .slice(0, 60);

        const ownership = users.map((user) => {
            const ownedDeals = deals.filter((deal) => deal.ownerId === user.id);
            const openTasks = tasks.filter((task) => task.assignedToId === user.id && task.status !== "done");
            const completedTasks = tasks.filter((task) => task.assignedToId === user.id && task.status === "done");
            const logs = recentLogs.filter((log) => log.userId === user.id);

            return {
                ...user,
                ownedDeals: ownedDeals.length,
                highPriorityDeals: ownedDeals.filter((deal) => deal.priority === "high").length,
                openTasks: openTasks.length,
                completedTasks: completedTasks.length,
                activityCount14d: logs.length,
                scanCount14d: logs.filter((log) => log.action.includes("scan")).length,
                dealUpdates14d: logs.filter((log) => log.action === "deal_updated").length,
            };
        });

        const taskBuckets = {
            todo: tasks.filter((task) => task.status === "todo").length,
            in_progress: tasks.filter((task) => task.status === "in_progress").length,
            blocked: tasks.filter((task) => task.status === "blocked").length,
            done: tasks.filter((task) => task.status === "done").length,
        };
        const currentUser = session?.user as { id?: string } | undefined;

        return NextResponse.json({
            generatedAt: now.toISOString(),
            currentUserId: currentUser?.id || null,
            pipeline: {
                totalDeals: deals.length,
                statusCounts,
                unassignedDeals: unassignedDeals.length,
                highPriorityDeals: highPriorityDeals.length,
                staleDeals: staleDeals.length,
                ownerCoveragePct: deals.length ? Math.round((dealsWithOwner / deals.length) * 100) : 0,
                nextActionCoveragePct: deals.length ? Math.round((dealsWithNextAction / deals.length) * 100) : 0,
                overdueNextActions,
                dueTodayNextActions,
            },
            tasks: {
                total: tasks.length,
                overdue: overdueTasks.length,
                buckets: taskBuckets,
                dueToday: dueTodayTasks.length,
                dueNext24h: dueNext24hTasks.length,
                blocked: blockedTasks.length,
                unassigned: unassignedTasks.length,
            },
            ownership,
            staleDeals,
            overdueTasks,
            recentTasks: tasks.slice(0, 40),
            unassignedDealList: unassignedDeals.slice(0, 40),
            criticalDeals,
        });
    } catch (error) {
        console.error("CRM overview error:", error);
        return NextResponse.json({ error: "Failed to load CRM overview" }, { status: 500 });
    }
}
