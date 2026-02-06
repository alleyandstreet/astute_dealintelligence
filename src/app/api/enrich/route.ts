
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enrichDeal } from "@/lib/contact-scraper";

export async function POST(req: Request) {
    try {
        const { dealId } = await req.json();

        if (!dealId) {
            return NextResponse.json({ error: "Missing dealId" }, { status: 400 });
        }

        const deal = await db.deal.findUnique({
            where: { id: dealId },
        });

        if (!deal) {
            return NextResponse.json({ error: "Deal not found" }, { status: 404 });
        }

        let targetUrl = deal.redditUrl;

        // If it's a reddit URL, try to find a real URL in the description or name
        if (targetUrl && targetUrl.includes("reddit.com")) {
            const content = (deal.description || "") + " " + (deal.name || "");
            const urlMatch = content.match(/https?:\/\/[^\s]+/);
            if (urlMatch) targetUrl = urlMatch[0];
        }

        if (!targetUrl || targetUrl.includes("reddit.com")) {
            return NextResponse.json({
                success: false,
                message: "No external URL found for this deal to scrape."
            });
        }

        // Trigger enrichment asynchronously
        enrichDeal(deal.id, targetUrl).catch(err => console.error("Manual enrichment failed:", err));

        return NextResponse.json({
            success: true,
            message: "Enrichment started in background. Check notes in a few seconds."
        });

    } catch (error) {
        console.error("Enrichment API error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
