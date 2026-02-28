import type { RawScrapedItem, UnifiedPlatformContext } from "@/lib/unified-search/types";

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

export async function fetchIndieHackersSeed(context: UnifiedPlatformContext): Promise<RawScrapedItem[]> {
    const query = context.seed.trim();
    const maxItems = Math.max(1, context.input.maxItemsPerPlatform ?? 80);

    const response = await fetch(`https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`, {
        method: "POST",
        headers: {
            "X-Algolia-Application-Id": ALGOLIA_APP_ID,
            "X-Algolia-API-Key": ALGOLIA_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            params: `query=${encodeURIComponent(query)}&hitsPerPage=${maxItems}`,
        }),
    });

    if (!response.ok) {
        throw new Error(`IndieHackers Algolia error ${response.status}`);
    }

    const payload = await response.json();
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
                createdAt: hit.createdTimestamp ? new Date(hit.createdTimestamp) : undefined,
                metadata: {
                    revenue: hit.revenue || 0,
                },
            };
        });
}
