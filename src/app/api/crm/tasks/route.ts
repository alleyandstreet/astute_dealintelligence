import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";
import { NextRequest, NextResponse } from "next/server";

function normalizeStatus(value: unknown): string {
    const status = String(value || "").trim().toLowerCase();
    if (["todo", "in_progress", "blocked", "done"].includes(status)) return status;
    return "todo";
}

function normalizePriority(value: unknown): string {
    const priority = String(value || "").trim().toLowerCase();
    if (["low", "medium", "high"].includes(priority)) return priority;
    return "medium";
}

export async function GET(request: NextRequest) {
    const { response } = await requireAuth({
        feature: "team_crm",
        rateLimitKey: "team_crm_requests",
    });
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const assignedToId = searchParams.get("assignedToId");
    const dealId = searchParams.get("dealId");

    try {
        const tasks = await db.crmTask.findMany({
            where: {
                status: status || undefined,
                assignedToId: assignedToId || undefined,
                dealId: dealId || undefined,
            },
            include: {
                assignedTo: { select: { id: true, username: true, email: true } },
                createdBy: { select: { id: true, username: true, email: true } },
                deal: { select: { id: true, name: true, status: true, priority: true } },
            },
            orderBy: [{ status: "asc" }, { priority: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
        });

        return NextResponse.json(tasks);
    } catch (error) {
        console.error("CRM tasks fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch CRM tasks" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const { session, response } = await requireAuth({
        feature: "team_crm",
        rateLimitKey: "team_crm_requests",
    });
    if (response) return response;

    try {
        const body = await request.json();
        const title = String(body.title || "").trim();
        if (!title) {
            return NextResponse.json({ error: "Task title is required" }, { status: 400 });
        }

        const task = await db.crmTask.create({
            data: {
                title: title.slice(0, 300),
                description: body.description ? String(body.description).slice(0, 3000) : null,
                status: normalizeStatus(body.status),
                priority: normalizePriority(body.priority),
                dueDate: body.dueDate ? new Date(body.dueDate) : null,
                notes: body.notes ? String(body.notes).slice(0, 2000) : null,
                dealId: body.dealId || null,
                assignedToId: body.assignedToId || null,
                createdById: (session?.user as any)?.id || null,
            },
            include: {
                assignedTo: { select: { id: true, username: true, email: true } },
                createdBy: { select: { id: true, username: true, email: true } },
                deal: { select: { id: true, name: true, status: true, priority: true } },
            },
        });

        if ((session?.user as any)?.id) {
            await logActivity({
                userId: (session.user as any).id,
                action: "crm_task_created",
                details: `Created CRM task: ${task.title}`,
                ipAddress: request.headers.get("x-forwarded-for") || undefined,
            });
        }

        return NextResponse.json(task, { status: 201 });
    } catch (error) {
        console.error("CRM task create error:", error);
        return NextResponse.json({ error: "Failed to create CRM task" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    const { session, response } = await requireAuth({
        feature: "team_crm",
        rateLimitKey: "team_crm_requests",
    });
    if (response) return response;

    try {
        const body = await request.json();
        const id = String(body.id || "").trim();
        if (!id) {
            return NextResponse.json({ error: "Task id is required" }, { status: 400 });
        }

        const status = body.status !== undefined ? normalizeStatus(body.status) : undefined;

        const task = await db.crmTask.update({
            where: { id },
            data: {
                title: body.title ? String(body.title).slice(0, 300) : undefined,
                description: body.description !== undefined ? (body.description ? String(body.description).slice(0, 3000) : null) : undefined,
                status,
                priority: body.priority !== undefined ? normalizePriority(body.priority) : undefined,
                dueDate: body.dueDate !== undefined ? (body.dueDate ? new Date(body.dueDate) : null) : undefined,
                notes: body.notes !== undefined ? (body.notes ? String(body.notes).slice(0, 2000) : null) : undefined,
                dealId: body.dealId !== undefined ? body.dealId || null : undefined,
                assignedToId: body.assignedToId !== undefined ? body.assignedToId || null : undefined,
                completedAt: status === "done" ? new Date() : status ? null : undefined,
            },
            include: {
                assignedTo: { select: { id: true, username: true, email: true } },
                createdBy: { select: { id: true, username: true, email: true } },
                deal: { select: { id: true, name: true, status: true, priority: true } },
            },
        });

        if ((session?.user as any)?.id) {
            await logActivity({
                userId: (session.user as any).id,
                action: "crm_task_updated",
                details: `Updated CRM task: ${task.title}`,
                ipAddress: request.headers.get("x-forwarded-for") || undefined,
            });
        }

        return NextResponse.json(task);
    } catch (error) {
        console.error("CRM task update error:", error);
        return NextResponse.json({ error: "Failed to update CRM task" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const { session, response } = await requireAuth({
        feature: "team_crm",
        rateLimitKey: "team_crm_requests",
    });
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get("id") || "").trim();
    if (!id) {
        return NextResponse.json({ error: "Task id is required" }, { status: 400 });
    }

    try {
        await db.crmTask.delete({ where: { id } });

        if ((session?.user as any)?.id) {
            await logActivity({
                userId: (session.user as any).id,
                action: "crm_task_updated",
                details: `Deleted CRM task ${id}`,
                ipAddress: request.headers.get("x-forwarded-for") || undefined,
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("CRM task delete error:", error);
        return NextResponse.json({ error: "Failed to delete CRM task" }, { status: 500 });
    }
}
