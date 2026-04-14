import { db } from "@/lib/db";
import type { DedupedDeal } from "@/lib/unified-search/types";

interface PersistOptions {
    minARR?: number;
    maxARR?: number;
    strictRevenue?: boolean;
}

export async function persistUnifiedDeals(
    dedupedDeals: DedupedDeal[],
    options: PersistOptions,
): Promise<{ created: number; filteredByARR: number }> {
    let created = 0;
    let filteredByARR = 0;

    for (const deal of dedupedDeals) {
        const arr = deal.arrEstimate;

        if (typeof options.minARR === "number" && arr !== null && arr < options.minARR) {
            filteredByARR += 1;
            continue;
        }

        if (typeof options.maxARR === "number") {
            if (arr !== null && arr > options.maxARR) {
                filteredByARR += 1;
                continue;
            }
            if (options.strictRevenue && arr === null) {
                filteredByARR += 1;
                continue;
            }
        }

        const sourceId = `unified:${deal.primary.platform}:${deal.primary.sourceId}`;

        const existingBySource = await db.deal.findUnique({
            where: { sourceId },
        });
        if (existingBySource) continue;

        if (deal.primary.url) {
            const existingByUrl = await db.deal.findFirst({
                where: { redditUrl: deal.primary.url },
            });
            if (existingByUrl) continue;
        }

        // For Product Hunt: use the PH listing URL for "View Original Post",
        // and the product website for "Website". For other platforms, use url for both.
        const isProductHunt = deal.primary.platform === "producthunt";
        const phListingUrl = isProductHunt 
            ? (deal.primary.metadata?.productHuntUrl as string | undefined) 
            : undefined;
        const makerTwitter = isProductHunt
            ? (deal.primary.metadata?.makerTwitter as string | undefined)
            : undefined;

        await db.deal.create({
            data: {
                name: deal.primary.title.slice(0, 200),
                description: deal.primary.body.slice(0, 2000),
                source: deal.primary.platform,
                sourceName: `Unified(${deal.platforms.join(",")})`,
                sourceId,
                // redditUrl = "View Original Post" link
                // For PH: the PH listing page. For others: the post URL.
                redditUrl: phListingUrl || deal.primary.url,
                redditAuthor: deal.primary.author || null,
                status: "new_leads",
                aiSummary: `Unified scan (${Math.round(deal.confidence * 100)}% confidence). ${deal.primary.classification.reasons.slice(0, 3).join("; ")}`,
                viabilityScore: Math.round(deal.confidence * 100),
                motivationScore: Math.min(100, Math.max(30, Math.round(deal.confidence * 80))),
                dealQuality: Math.round(deal.confidence * 100),
                riskFlags: JSON.stringify([]),
                sellerSignals: JSON.stringify(deal.primary.classification.reasons.slice(0, 6)),
                businessType: "Unified Candidate",
                industry: typeof deal.primary.metadata?.industry === "string" ? deal.primary.metadata.industry : null,
                revenue: arr,
                revenueType: deal.primary.classification.revenueHint,
                // contactWebsite = the product's own website
                contactWebsite: deal.primary.url || null,
                // Populate real contact info from maker profiles
                contactTwitter: makerTwitter || null,
            },
        });

        created += 1;
    }

    return { created, filteredByARR };
}
