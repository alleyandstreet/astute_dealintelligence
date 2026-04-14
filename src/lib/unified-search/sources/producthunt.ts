import type { RawScrapedItem, UnifiedPlatformContext } from "@/lib/unified-search/types";

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

// Single shared cursor — the PH `posts` endpoint is global (not topic-scoped),
// so all seeds share one pagination position.
let paginationCursor: string | null = null;

// Per-pass batch cache: once one seed triggers an API call, all other seeds
// in the same pass reuse the cached raw items (avoiding duplicate API calls).
let batchCacheItems: any[] | null = null;
let batchCacheTimestamp = 0;
const BATCH_CACHE_TTL_MS = 10_000; // 10s — covers all seeds within one pass

/** Reset pagination state for a fresh scan. */
export function resetPHCursors() {
    paginationCursor = null;
    batchCacheItems = null;
    batchCacheTimestamp = 0;
}

/** Expire the batch cache so the next pass fetches the next page.
 *  Keeps the cursor so pagination advances forward. */
export function advancePHPage() {
    batchCacheItems = null;
    batchCacheTimestamp = 0;
}

async function getAccessToken(): Promise<string> {
    if (cachedToken && Date.now() < tokenExpiresAt) {
        return cachedToken;
    }

    const clientId = process.env.PH_API_KEY;
    const clientSecret = process.env.PH_API_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error("Missing Product Hunt API credentials in environment variables.");
    }

    const authRes = await fetch('https://api.producthunt.com/v2/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'client_credentials'
        })
    });

    if (!authRes.ok) {
        const text = await authRes.text();
        throw new Error(`Product Hunt Auth failed: ${authRes.status} ${text}`);
    }

    const data = await authRes.json();
    cachedToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 300000;
    
    return cachedToken as string;
}

/**
 * Fetch a batch of posts from PH.  Uses a short-lived cache so that within
 * one pass (where multiple seeds run), we only hit the API once.
 * Between passes, the cache expires and pagination advances via the cursor.
 */
async function fetchBatch(accessToken: string, limit: number): Promise<any[]> {
    // Return cached batch if still fresh (same pass)
    if (batchCacheItems && Date.now() - batchCacheTimestamp < BATCH_CACHE_TTL_MS) {
        return batchCacheItems;
    }

    const query = `
        query ($first: Int!, $after: String) {
            posts(first: $first, after: $after) {
                pageInfo {
                    endCursor
                    hasNextPage
                }
                edges {
                    node {
                        id
                        name
                        tagline
                        description
                        url
                        website
                        createdAt
                        votesCount
                        slug
                        topics {
                            edges {
                                node {
                                    name
                                }
                            }
                        }
                        makers {
                            name
                            headline
                            twitterUsername
                            websiteUrl
                        }
                    }
                }
            }
        }
    `;

    const res = await fetch('https://api.producthunt.com/v2/api/graphql', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            query,
            variables: { first: limit, after: paginationCursor }
        })
    });

    if (!res.ok) {
        throw new Error(`Product Hunt GraphQL failed: ${res.status}`);
    }

    const { data, errors } = await res.json();
    if (errors && errors.length > 0) {
        throw new Error(`Product Hunt GraphQL error: ${errors[0].message}`);
    }

    // Advance shared cursor for next pass
    const pageInfo = data?.posts?.pageInfo;
    if (pageInfo?.endCursor) {
        paginationCursor = pageInfo.endCursor;
    }

    const items = (data?.posts?.edges || []).map((edge: any) => edge.node);

    // Cache for the rest of this pass
    batchCacheItems = items;
    batchCacheTimestamp = Date.now();

    return items;
}

export async function fetchProductHuntSeed(context: UnifiedPlatformContext): Promise<RawScrapedItem[]> {
    const topic = context.seed.trim().toLowerCase();
    const maxItems = Math.max(1, context.input.maxItemsPerPlatform ?? 50);

    const accessToken = await getAccessToken();
    const fetchLimit = Math.min(maxItems, 20);

    // All seeds share the same batch — only one API call per pass
    const allItems = await fetchBatch(accessToken, fetchLimit);

    // Filter locally by topic
    let items = allItems;
    if (topic !== 'all' && topic !== 'home') {
        items = allItems.filter((item: any) => {
            const itemTopics = (item.topics?.edges || []).map((e: any) => e.node.name.toLowerCase());
            return itemTopics.some((t: string) => t.includes(topic) || topic.includes(t));
        });
    }

    return items.slice(0, maxItems).map((item: any) => {
        const descParts: string[] = [];
        if (item.tagline) descParts.push(item.tagline);
        if (item.description) descParts.push(item.description);
        
        const topicNames = (item.topics?.edges || []).map((e: any) => e.node.name);
        if (topicNames.length > 0) {
            descParts.push(`Topics: ${topicNames.join(", ")}`);
        }
        if (item.votesCount != null) {
            descParts.push(`Upvotes: ${item.votesCount}`);
        }

        const bodyContent = descParts.join("\n\n");

        const makers = item.makers || [];
        const realMakerNames = makers
            .map((m: any) => m.name)
            .filter((name: string) => name && name !== "[REDACTED]");
        const authorContent = realMakerNames.length > 0 ? realMakerNames.join(", ") : undefined;

        const firstMakerTwitter = makers.find((m: any) => m.twitterUsername && m.twitterUsername !== "[REDACTED]")?.twitterUsername;
        const firstMakerWebsite = makers.find((m: any) => m.websiteUrl && m.websiteUrl !== "[REDACTED]")?.websiteUrl;

        return {
            platform: "producthunt" as const,
            sourceName: topic === "all" || topic === "home" ? "ProductHunt" : `ProductHunt:${topic}`,
            sourceId: item.id || `ph:${item.name}`,
            title: item.name || "Untitled",
            body: bodyContent,
            url: item.website || undefined,
            author: authorContent,
            createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
            metadata: { 
                topic, 
                votesCount: item.votesCount,
                topics: topicNames,
                productHuntUrl: item.url || `https://www.producthunt.com/posts/${item.slug}`,
                makerTwitter: firstMakerTwitter ? `https://x.com/${firstMakerTwitter}` : undefined,
                makerWebsite: firstMakerWebsite || undefined,
            },
        };
    });
}
