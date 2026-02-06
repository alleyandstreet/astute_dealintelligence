import { NextRequest, NextResponse } from "next/server";
import { DeepAnalysisService } from "@/lib/services/deep-analysis";
import { db as prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { dealId } = body;

        if (!dealId) {
            return NextResponse.json({ error: "Deal ID is required" }, { status: 400 });
        }

        // Fetch the deal to get context
        const deal = await prisma.deal.findUnique({
            where: { id: dealId },
        });

        if (!deal) {
            return NextResponse.json({ error: "Deal not found" }, { status: 404 });
        }

        // Construct context from deal data
        const context = `
      Title: ${deal.name}
      Description: ${deal.description || "N/A"}
      Industry: ${deal.industry || "N/A"}
      Revenue: ${deal.revenue || "N/A"}
      Asking Price: ${deal.askingPrice || "N/A"}
      Source: ${deal.source} (${deal.sourceName})
      Analysis Summary: ${deal.aiSummary || "N/A"}
      Risk Flags: ${deal.riskFlags || "N/A"}
    `;

        // Generate Memo
        const memo = await DeepAnalysisService.generateMemo(context);

        if (!memo) {
            console.error("Deep Dive Error: Service returned null (likely AI failure or rate limit)");
            return NextResponse.json({ error: "Failed to generate memo - AI Service Error" }, { status: 500 });
        }

        // Optionally save the memo to the database (if schema supports it, or just return it for now)
        // For now, we'll just return it. In a real app, we'd probably store it in a 'DealInsight' table.

        return NextResponse.json(memo);

    } catch (error) {
        console.error("Deep Dive API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
