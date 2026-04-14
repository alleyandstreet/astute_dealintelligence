import type { RawScrapedItem, UnifiedPlatformContext } from "@/lib/unified-search/types";

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

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
    // Expire 5 minutes early to be safe
    tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 300000;
    
    return cachedToken as string;
}

export async function fetchProductHuntSeed(context: UnifiedPlatformContext): Promise<RawScrapedItem[]> {
    const topic = context.seed.trim().toLowerCase();
    const maxItems = Math.max(1, context.input.maxItemsPerPlatform ?? 50);

    const accessToken = await getAccessToken();

    // Query official API — request both website and the PH listing url
    const query = `
        query ($first: Int!) {
            posts(first: $first) {
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

    // PH API has a ~500k complexity budget; 20 posts with nested fields stays well under.
    const fetchLimit = Math.min(maxItems, 20);

    const res = await fetch('https://api.producthunt.com/v2/api/graphql', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            query,
            variables: { first: fetchLimit }
        })
    });

    if (!res.ok) {
        throw new Error(`Product Hunt GraphQL failed: ${res.status}`);
    }

    const { data, errors } = await res.json();
    if (errors && errors.length > 0) {
        throw new Error(`Product Hunt GraphQL error: ${errors[0].message}`);
    }

    let items = (data?.posts?.edges || []).map((edge: any) => edge.node);

    // Filter locally by topic if a specific topic was requested
    if (topic !== 'all' && topic !== 'home') {
        items = items.filter((item: any) => {
            const itemTopics = (item.topics?.edges || []).map((e: any) => e.node.name.toLowerCase());
            return itemTopics.some((t: string) => t.includes(topic) || topic.includes(t));
        });
    }

    return items.slice(0, maxItems).map((item: any) => {
        // Build a rich description body
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

        // Extract real maker contact information
        // Note: PH API redacts PII (names, twitter, websites) for client_credentials apps.
        // We filter out "[REDACTED]" values to avoid showing useless placeholder text.
        const makers = item.makers || [];
        const realMakerNames = makers
            .map((m: any) => m.name)
            .filter((name: string) => name && name !== "[REDACTED]");
        const authorContent = realMakerNames.length > 0 ? realMakerNames.join(", ") : undefined;

        // Get non-redacted twitter/website from makers
        const firstMakerTwitter = makers.find((m: any) => m.twitterUsername && m.twitterUsername !== "[REDACTED]")?.twitterUsername;
        const firstMakerWebsite = makers.find((m: any) => m.websiteUrl && m.websiteUrl !== "[REDACTED]")?.websiteUrl;

        return {
            platform: "producthunt" as const,
            sourceName: topic === "all" || topic === "home" ? "ProductHunt" : `ProductHunt:${topic}`,
            sourceId: item.id || `ph:${item.name}`,
            title: item.name || "Untitled",
            body: bodyContent,
            // url = the product's own website (for the "Website" link)
            url: item.website || undefined,
            author: authorContent,
            createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
            metadata: { 
                topic, 
                votesCount: item.votesCount,
                topics: topicNames,
                // The PH listing URL (for "View Original Post")
                productHuntUrl: item.url || `https://www.producthunt.com/posts/${item.slug}`,
                // Real contact data from maker profiles (if not redacted)
                makerTwitter: firstMakerTwitter ? `https://x.com/${firstMakerTwitter}` : undefined,
                makerWebsite: firstMakerWebsite || undefined,
            },
        };
    });
}
