import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { publishDealsChanged } from "@/lib/deal-collaboration";
import { Prisma } from "@prisma/client";

type SessionUser = {
    id?: string;
};

export async function GET(request: NextRequest) {
    const { response } = await requireAuth({
        feature: "deal_sourcing",
        rateLimitKey: "deal_sourcing_requests",
    });
    if (response) return response;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (id) {
            const deal = await db.deal.findUnique({
                where: { id },
                include: {
                    owner: {
                        select: { id: true, username: true, email: true },
                    },
                    lastMovedBy: {
                        select: { id: true, username: true, email: true },
                    },
                    tags: { include: { tag: true } },
                    notes: true,
                    crmTasks: {
                        orderBy: { createdAt: "desc" },
                        take: 20,
                    },
                },
            });

            if (!deal) {
                return NextResponse.json({ error: "Deal not found" }, { status: 404 });
            }

            return NextResponse.json(deal);
        }

        const deals = await db.deal.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                owner: {
                    select: { id: true, username: true, email: true },
                },
                lastMovedBy: {
                    select: { id: true, username: true, email: true },
                },
                tags: { include: { tag: true } },
                notes: true,
                crmTasks: {
                    orderBy: { createdAt: "desc" },
                    take: 10,
                },
            },
        });
        return NextResponse.json(deals);
    } catch (error) {
        console.error("Error fetching deals:", error);
        return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const { session, response } = await requireAuth({
        feature: "deal_sourcing",
        rateLimitKey: "deal_sourcing_requests",
    });
    if (response) return response;

    try {
        const body = await request.json();
        const sessionUser = session?.user as SessionUser | undefined;

        const deal = await db.deal.create({
            data: {
                name: body.name,
                description: body.description || null,
                industry: body.industry || null,
                location: body.location || null,
                url: body.url || null,
                askingPrice: body.askingPrice || null,
                revenue: body.revenue || null,
                revenueType: body.revenueType || null,
                ebitda: body.ebitda || null,
                sde: body.sde || null,
                valuationMin: body.valuationMin || null,
                valuationMax: body.valuationMax || null,
                source: body.source || "manual",
                sourceId: body.sourceId || null,
                sourceName: body.sourceName || (body.source ? body.source.charAt(0).toUpperCase() + body.source.slice(1) : "Manual"),
                redditUrl: body.redditUrl || null,
                redditAuthor: body.redditAuthor || null,
                redditScore: body.redditScore || null,
                redditComments: body.redditComments || null,
                status: body.status || "new_leads",
                aiSummary: body.aiSummary || null,
                viabilityScore: body.viabilityScore || null,
                motivationScore: body.motivationScore || null,
                dealQuality: body.dealQuality || null,
                riskFlags: body.riskFlags ? JSON.stringify(body.riskFlags) : null,
                sellerSignals: body.sellerSignals ? JSON.stringify(body.sellerSignals) : null,
                businessType: body.businessType || null,
                contactReddit: body.contactReddit || null,
                contactEmail: body.contactEmail || null,
                contactWebsite: body.contactWebsite || null,
                contactTwitter: body.contactTwitter || null,
                contactLinkedIn: body.contactLinkedIn || null,
                contactDiscord: body.contactDiscord || null,
                ownerId: body.ownerId || null,
                priority: body.priority || "medium",
                nextAction: body.nextAction || null,
                nextActionAt: body.nextActionAt ? new Date(body.nextActionAt) : null,
                lastContactedAt: body.lastContactedAt ? new Date(body.lastContactedAt) : null,
            },
        });

        if (sessionUser?.id) {
            await logActivity({
                userId: sessionUser.id,
                action: "deal_created",
                details: `Created deal: ${deal.name}`,
                ipAddress: request.headers.get("x-forwarded-for") || undefined,
            });
        }

        publishDealsChanged("deal_created");
        return NextResponse.json(deal, { status: 201 });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return NextResponse.json({ error: "Deal already exists in pipeline" }, { status: 409 });
        }
        console.error("Error creating deal:", error);
        return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    const { session, response } = await requireAuth({
        feature: "deal_sourcing",
        rateLimitKey: "deal_sourcing_requests",
    });
    if (response) return response;

    try {
        const body = await request.json();
        const sessionUser = session?.user as SessionUser | undefined;
        const { id, ...data } = body;

        if (!id) {
            return NextResponse.json({ error: "Deal ID required" }, { status: 400 });
        }

        const normalizedData = { ...data } as Record<string, unknown>;
        if ("nextActionAt" in normalizedData) {
            normalizedData.nextActionAt = normalizedData.nextActionAt ? new Date(String(normalizedData.nextActionAt)) : null;
        }
        if ("lastContactedAt" in normalizedData) {
            normalizedData.lastContactedAt = normalizedData.lastContactedAt ? new Date(String(normalizedData.lastContactedAt)) : null;
        }
        if ("status" in normalizedData && sessionUser?.id) {
            normalizedData.lastMovedById = sessionUser.id;
        }

        const deal = await db.deal.update({
            where: { id },
            data: normalizedData as Prisma.DealUpdateInput,
        });

        if (sessionUser?.id) {
            const updates = Object.keys(normalizedData).join(", ");
            await logActivity({
                userId: sessionUser.id,
                action: "deal_updated",
                details: `Updated deal ${deal.name} (ID: ${id}). Fields: ${updates}`,
                ipAddress: request.headers.get("x-forwarded-for") || undefined,
            });
        }

        publishDealsChanged("deal_updated");
        return NextResponse.json(deal);
    } catch (error) {
        console.error("Error updating deal:", error);
        return NextResponse.json({ error: "Failed to update deal" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const { session, response } = await requireAuth({
        feature: "deal_sourcing",
        rateLimitKey: "deal_sourcing_requests",
    });
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const action = searchParams.get("action");

    console.log(`DELETE request received: id=${id}, action=${action}`);

    try {
        // Bulk Delete Support: Try to parse body for "ids"
        let bulkIds: string[] = [];
        try {
            // Clone request to avoid "Body is unusable" if we read it and fail
            const body = await request.clone().json().catch(() => ({}));
            if (body.ids && Array.isArray(body.ids)) {
                bulkIds = body.ids;
            }
        } catch {
            // Ignore body read errors (e.g. GET/DELETE with no body)
        }

        if (bulkIds.length > 0) {
            console.log(`Bulk deleting ${bulkIds.length} deals`);
            await db.deal.deleteMany({
                where: { id: { in: bulkIds } },
            });
            publishDealsChanged("deals_bulk_deleted");
            return NextResponse.json({ success: true, count: bulkIds.length });
        }

        if (action === "reset") {
            console.log("Performing TOTAL RESET");
            await db.$transaction([
                db.note.deleteMany({}),
                db.outreach.deleteMany({}),
                db.dealTag.deleteMany({}),
                db.deal.deleteMany({}),
            ]);

            const sessionUser = session?.user as SessionUser | undefined;
            if (sessionUser?.id) {
                await logActivity({
                    userId: sessionUser.id,
                    action: "deal_deleted",
                    details: "PERFORMED TOTAL SYSTEM COMPLETE RESET",
                    ipAddress: request.headers.get("x-forwarded-for") || undefined,
                });
            }
            console.log("TOTAL RESET successful");
            publishDealsChanged("deals_reset");
            return NextResponse.json({ success: true, message: "All data reset" });
        }

        if (!id) {
            return NextResponse.json({ error: "Deal ID required" }, { status: 400 });
        }

        try {
            await db.deal.delete({
                where: { id },
            });

            const sessionUser = session?.user as SessionUser | undefined;
            if (sessionUser?.id) {
                await logActivity({
                    userId: sessionUser.id,
                    action: "deal_deleted",
                    details: `Deleted deal ID: ${id}`,
                    ipAddress: request.headers.get("x-forwarded-for") || undefined,
                });
            }
        } catch (error: unknown) {
            // If record to delete is not found, we consider it a success (idempotent)
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
                return NextResponse.json({ success: true, message: "Deal already deleted" });
            }
            throw error;
        }

        publishDealsChanged("deal_deleted");
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting deal:", error);
        return NextResponse.json({ error: "Failed to delete deal" }, { status: 500 });
    }
}
