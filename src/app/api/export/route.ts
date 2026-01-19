import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// GET - Export deals as JSON (can be converted to CSV client-side)
export async function GET() {
    try {
        const deals = await db.deal.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                notes: true,
            },
        });

        // Format for export
        const exportData = deals.map((deal) => ({
            id: deal.id,
            name: deal.name,
            industry: deal.industry || "",
            businessType: deal.businessType || "",
            revenue: deal.revenue || "",
            revenueType: deal.revenueType || "",
            valuationMin: deal.valuationMin || "",
            valuationMax: deal.valuationMax || "",
            viabilityScore: deal.viabilityScore || "",
            motivationScore: deal.motivationScore || "",
            status: deal.status,
            aiSummary: deal.aiSummary || "",
            redditAuthor: deal.redditAuthor || "",
            redditUrl: deal.redditUrl || "",
            riskFlags: deal.riskFlags || "",
            sellerSignals: deal.sellerSignals || "",
            notesCount: deal.notes.length,
            createdAt: deal.createdAt.toISOString(),
        }));

        return NextResponse.json(exportData);
    } catch (error) {
        console.error("Error exporting deals:", error);
        return NextResponse.json({ error: "Failed to export deals" }, { status: 500 });
    }
}
