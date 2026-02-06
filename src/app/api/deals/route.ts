import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (id) {
            const deal = await db.deal.findUnique({
                where: { id },
                include: {
                    tags: { include: { tag: true } },
                    notes: true,
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
                tags: { include: { tag: true } },
                notes: true,
            },
        });
        return NextResponse.json(deals);
    } catch (error) {
        console.error("Error fetching deals:", error);
        return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

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
                sourceName: body.sourceName || null,
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
            },
        });

        const session = await getServerSession(authOptions);
        if (session?.user) {
            await logActivity({
                userId: (session.user as any).id,
                action: "deal_created",
                details: `Created deal: ${deal.name}`,
                ipAddress: request.headers.get("x-forwarded-for") || undefined,
            });
        }

        return NextResponse.json(deal, { status: 201 });
    } catch (error) {
        console.error("Error creating deal:", error);
        return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...data } = body;

        if (!id) {
            return NextResponse.json({ error: "Deal ID required" }, { status: 400 });
        }

        const deal = await db.deal.update({
            where: { id },
            data,
        });

        const session = await getServerSession(authOptions);
        if (session?.user) {
            const updates = Object.keys(data).join(", ");
            await logActivity({
                userId: (session.user as any).id,
                action: "deal_updated",
                details: `Updated deal ${deal.name} (ID: ${id}). Fields: ${updates}`,
                ipAddress: request.headers.get("x-forwarded-for") || undefined,
            });
        }

        return NextResponse.json(deal);
    } catch (error) {
        console.error("Error updating deal:", error);
        return NextResponse.json({ error: "Failed to update deal" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
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
        } catch (e) {
            // Ignore body read errors (e.g. GET/DELETE with no body)
        }

        if (bulkIds.length > 0) {
            console.log(`Bulk deleting ${bulkIds.length} deals`);
            await db.deal.deleteMany({
                where: { id: { in: bulkIds } },
            });
            return NextResponse.json({ success: true, count: bulkIds.length });
        }

        if (action === "reset") {
            console.log("Performing TOTAL RESET");
            await db.$transaction([
                db.note.deleteMany({}),
                db.outreach.deleteMany({}),
                db.dealTag.deleteMany({}),
                db.deal.deleteMany({}),
                db.deal.deleteMany({}),
            ]);

            const session = await getServerSession(authOptions);
            if (session?.user) {
                await logActivity({
                    userId: (session.user as any).id,
                    action: "deal_deleted",
                    details: "PERFORMED TOTAL SYSTEM COMPLETE RESET",
                    ipAddress: request.headers.get("x-forwarded-for") || undefined,
                });
            }
            console.log("TOTAL RESET successful");
            return NextResponse.json({ success: true, message: "All data reset" });
        }

        if (!id) {
            return NextResponse.json({ error: "Deal ID required" }, { status: 400 });
        }

        try {
            await db.deal.delete({
                where: { id },
            });

            const session = await getServerSession(authOptions);
            if (session?.user) {
                await logActivity({
                    userId: (session.user as any).id,
                    action: "deal_deleted",
                    details: `Deleted deal ID: ${id}`,
                    ipAddress: request.headers.get("x-forwarded-for") || undefined,
                });
            }
        } catch (error: any) {
            // If record to delete is not found, we consider it a success (idempotent)
            if (error.code === "P2025") {
                return NextResponse.json({ success: true, message: "Deal already deleted" });
            }
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting deal:", error);
        return NextResponse.json({ error: "Failed to delete deal" }, { status: 500 });
    }
}
