import type { RawScrapedItem, UnifiedPlatformContext } from "@/lib/unified-search/types";
import { fetchJsonWithTimeout } from "@/lib/unified-search/sources/http";

const ALGOLIA_APP_ID = "N86T1R3OWZ";
const ALGOLIA_API_KEY = "5140dac5e87f47346abbda1a34ee70c3";
const ALGOLIA_INDEX = "products";

interface IndieHackersHit {
    objectID?: string;
    productId?: string;
    name?: string;
    tagline?: string;
    description?: string;
    websiteUrl?: string;
    twitterHandle?: string;
    createdTimestamp?: number;
    revenue?: number;
}

function toDate(timestamp?: number): Date | undefined {
    if (!timestamp || !Number.isFinite(timestamp)) return undefined;
    const millis = timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function fetchIndieHackersSeed(context: UnifiedPlatformContext): Promise<RawScrapedItem[]> {
    const query = context.seed.trim();
    const maxItems = Math.max(1, context.input.maxItemsPerPlatform ?? 80);

    const payload = await fetchJsonWithTimeout<{ hits?: IndieHackersHit[] }>(
        `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`,
        {
            method: "POST",
            headers: {
                "X-Algolia-Application-Id": ALGOLIA_APP_ID,
                "X-Algolia-API-Key": ALGOLIA_API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                params: `query=${encodeURIComponent(query)}&hitsPerPage=${maxItems}`,
            }),
        },
        { timeoutMs: 12000, label: "indiehackers:algolia" },
    );

    const hits = (payload?.hits || []) as IndieHackersHit[];

    return hits
        .filter((hit) => !!hit.name)
        .slice(0, maxItems)
        .map((hit) => {
            const revenueSuffix = hit.revenue && hit.revenue > 0 ? ` Revenue: $${hit.revenue}/mo.` : "";
            const url = hit.websiteUrl || (hit.productId ? `https://www.indiehackers.com/product/${hit.productId}` : undefined);

            return {
                platform: "indiehackers",
                sourceName: "IndieHackers Products",
                sourceId: String(hit.productId || hit.objectID || hit.name),
                title: hit.name || "Untitled",
                body: `${hit.tagline || ""} ${hit.description || ""}${revenueSuffix}`.trim(),
                url,
                author: hit.twitterHandle || undefined,
                createdAt: toDate(hit.createdTimestamp),
                metadata: {
                    revenue: hit.revenue || 0,
                },
            };
        });
}
