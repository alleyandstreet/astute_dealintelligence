import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
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
            ]);
            console.log("TOTAL RESET successful");
            return NextResponse.json({ success: true, message: "All data reset" });
        }

        if (!id) {
            return NextResponse.json({ error: "Deal ID required" }, { status: 400 });
        }

        await db.deal.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting deal:", error);
        return NextResponse.json({ error: "Failed to delete deal" }, { status: 500 });
    }
}
