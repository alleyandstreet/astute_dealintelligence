import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { HUB_FEATURE_DEFINITIONS, HUB_FEATURE_KEYS, type HubFeatureKey } from "@/lib/feature-access";
import {
    getOnboardingSettings,
    getTeamRateLimits,
    getUserFeatureAccessMap,
    isValidRateLimitKey,
    setAutoAssignOnboardingTemplate,
    setUserFeatureAccess,
    updateSingleRateLimit,
} from "@/lib/team-controls";

function isHubFeatureKey(value: string): value is HubFeatureKey {
    return (HUB_FEATURE_KEYS as readonly string[]).includes(value);
}

function parseSteps(raw: unknown): string[] {
    if (Array.isArray(raw)) {
        return raw.map((step) => String(step || "").trim()).filter(Boolean).slice(0, 200);
    }

    return String(raw || "")
        .split("\n")
        .map((step) => step.trim())
        .filter(Boolean)
        .slice(0, 200);
}

async function ensureSuperAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as { role?: string }).role !== "super_admin") {
        return { session: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    return { session, response: null };
}

export async function GET() {
    const { response } = await ensureSuperAdmin();
    if (response) return response;

    try {
        const [users, rateLimits, onboardingSettings, templates, assignments] = await Promise.all([
            db.user.findMany({
                select: {
                    id: true,
                    username: true,
                    email: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "asc" },
            }),
            getTeamRateLimits(),
            getOnboardingSettings(),
            db.onboardingTemplate.findMany({
                include: {
                    createdBy: {
                        select: { id: true, username: true, email: true },
                    },
                },
                orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
            }),
            db.onboardingAssignment.findMany({
                include: {
                    user: { select: { id: true, username: true, email: true, role: true } },
                    template: { select: { id: true, name: true, isDefault: true, isActive: true } },
                    assignedBy: { select: { id: true, username: true } },
                },
                orderBy: { createdAt: "desc" },
                take: 500,
            }),
        ]);

        const accessByUser: Record<string, Record<HubFeatureKey, boolean>> = {};
        for (const user of users) {
            accessByUser[user.id] = await getUserFeatureAccessMap(user.id, user.role);
        }

        return NextResponse.json({
            featureDefinitions: HUB_FEATURE_DEFINITIONS,
            users,
            accessByUser,
            rateLimits,
            onboarding: {
                settings: onboardingSettings,
                templates,
                assignments,
            },
        });
    } catch (error) {
        console.error("Admin team controls fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch control center data" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const { session, response } = await ensureSuperAdmin();
    if (response) return response;

    const actorId = (session?.user as { id?: string } | undefined)?.id || null;

    try {
        const body = await request.json();
        const action = String(body.action || "").trim();

        if (!action) {
            return NextResponse.json({ error: "Action is required" }, { status: 400 });
        }

        if (action === "set_feature_access") {
            const userId = String(body.userId || "").trim();
            const featureKey = String(body.featureKey || "").trim();
            const enabled = Boolean(body.enabled);

            if (!userId || !featureKey || !isHubFeatureKey(featureKey)) {
                return NextResponse.json({ error: "Invalid feature access request" }, { status: 400 });
            }

            const user = await db.user.findUnique({
                where: { id: userId },
                select: { id: true, role: true },
            });
            if (!user) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }

            const updated = await setUserFeatureAccess({
                userId: user.id,
                userRole: user.role,
                featureKey,
                enabled,
            });

            return NextResponse.json({ success: true, features: updated });
        }

        if (action === "set_rate_limit") {
            const key = String(body.key || "").trim();
            if (!isValidRateLimitKey(key)) {
                return NextResponse.json({ error: "Invalid rate limit key" }, { status: 400 });
            }

            const updated = await updateSingleRateLimit(key, {
                enabled: body.enabled !== undefined ? Boolean(body.enabled) : undefined,
                maxRequests: body.maxRequests !== undefined ? Number(body.maxRequests) : undefined,
                windowSeconds: body.windowSeconds !== undefined ? Number(body.windowSeconds) : undefined,
            });

            return NextResponse.json({ success: true, rateLimits: updated });
        }

        if (action === "create_onboarding_template") {
            const name = String(body.name || "").trim();
            const description = body.description ? String(body.description).trim() : null;
            const isDefault = Boolean(body.isDefault);
            const steps = parseSteps(body.steps);

            if (!name) {
                return NextResponse.json({ error: "Template name is required" }, { status: 400 });
            }
            if (steps.length === 0) {
                return NextResponse.json({ error: "At least one onboarding step is required" }, { status: 400 });
            }

            if (isDefault) {
                await db.onboardingTemplate.updateMany({
                    where: { isDefault: true },
                    data: { isDefault: false },
                });
            }

            const template = await db.onboardingTemplate.create({
                data: {
                    name: name.slice(0, 200),
                    description: description ? description.slice(0, 1000) : null,
                    steps,
                    isDefault,
                    isActive: true,
                    createdById: actorId,
                },
            });

            if (isDefault) {
                await setAutoAssignOnboardingTemplate(template.id);
            }

            return NextResponse.json({ success: true, template });
        }

        if (action === "update_onboarding_template") {
            const templateId = String(body.templateId || "").trim();
            if (!templateId) {
                return NextResponse.json({ error: "Template id is required" }, { status: 400 });
            }

            const current = await db.onboardingTemplate.findUnique({
                where: { id: templateId },
                select: { id: true, isDefault: true, isActive: true },
            });

            if (!current) {
                return NextResponse.json({ error: "Template not found" }, { status: 404 });
            }

            const isDefault = body.isDefault !== undefined ? Boolean(body.isDefault) : current.isDefault;
            if (isDefault) {
                await db.onboardingTemplate.updateMany({
                    where: { isDefault: true, id: { not: templateId } },
                    data: { isDefault: false },
                });
            }

            const nextIsActive = body.isActive !== undefined ? Boolean(body.isActive) : current.isActive;
            const steps = body.steps !== undefined ? parseSteps(body.steps) : undefined;

            const template = await db.onboardingTemplate.update({
                where: { id: templateId },
                data: {
                    name: body.name !== undefined ? String(body.name).slice(0, 200) : undefined,
                    description: body.description !== undefined ? (body.description ? String(body.description).slice(0, 1000) : null) : undefined,
                    steps: steps !== undefined ? steps : undefined,
                    isDefault,
                    isActive: nextIsActive,
                },
            });

            const onboardingSettings = await getOnboardingSettings();
            if (!template.isActive && onboardingSettings.autoAssignTemplateId === template.id) {
                await setAutoAssignOnboardingTemplate(null);
            }
            if (template.isDefault && template.isActive) {
                await setAutoAssignOnboardingTemplate(template.id);
            }

            return NextResponse.json({ success: true, template });
        }

        if (action === "delete_onboarding_template") {
            const templateId = String(body.templateId || "").trim();
            if (!templateId) {
                return NextResponse.json({ error: "Template id is required" }, { status: 400 });
            }

            await db.onboardingTemplate.delete({
                where: { id: templateId },
            });

            const onboardingSettings = await getOnboardingSettings();
            if (onboardingSettings.autoAssignTemplateId === templateId) {
                await setAutoAssignOnboardingTemplate(null);
            }

            return NextResponse.json({ success: true });
        }

        if (action === "assign_onboarding_template") {
            const userId = String(body.userId || "").trim();
            const templateId = String(body.templateId || "").trim();
            const dueDate = body.dueDate ? new Date(body.dueDate) : null;

            if (!userId || !templateId) {
                return NextResponse.json({ error: "User and template are required" }, { status: 400 });
            }

            const [user, template] = await Promise.all([
                db.user.findUnique({ where: { id: userId }, select: { id: true } }),
                db.onboardingTemplate.findUnique({ where: { id: templateId }, select: { id: true, isActive: true } }),
            ]);
            if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
            if (!template || !template.isActive) return NextResponse.json({ error: "Template unavailable" }, { status: 400 });

            const assignment = await db.onboardingAssignment.create({
                data: {
                    userId,
                    templateId,
                    dueDate,
                    assignedById: actorId,
                    status: "assigned",
                    progress: {},
                },
            });

            return NextResponse.json({ success: true, assignment });
        }

        if (action === "update_onboarding_assignment") {
            const assignmentId = String(body.assignmentId || "").trim();
            const status = String(body.status || "").trim();
            const notes = body.notes !== undefined ? (body.notes ? String(body.notes).slice(0, 2000) : null) : undefined;
            const progress = body.progress !== undefined ? body.progress : undefined;

            if (!assignmentId || !["assigned", "in_progress", "completed", "blocked"].includes(status)) {
                return NextResponse.json({ error: "Invalid assignment update" }, { status: 400 });
            }

            const now = new Date();
            const assignment = await db.onboardingAssignment.update({
                where: { id: assignmentId },
                data: {
                    status,
                    notes,
                    progress: progress !== undefined ? progress : undefined,
                    startedAt: status === "in_progress" ? now : undefined,
                    completedAt: status === "completed" ? now : status === "assigned" ? null : undefined,
                },
            });

            return NextResponse.json({ success: true, assignment });
        }

        if (action === "set_auto_assign_template") {
            const templateId = body.templateId ? String(body.templateId).trim() : null;
            const settings = await setAutoAssignOnboardingTemplate(templateId);
            return NextResponse.json({ success: true, settings });
        }

        return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    } catch (error) {
        console.error("Admin team controls update error:", error);
        return NextResponse.json({ error: "Failed to update control center settings" }, { status: 500 });
    }
}
