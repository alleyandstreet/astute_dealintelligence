import type { RawScrapedItem, UnifiedPlatformContext } from "@/lib/unified-search/types";

async function parseFeed(url: string) {
    const Parser = (await import("rss-parser")).default;
    const parser = new Parser({
        headers: {
            "User-Agent": "DealIntelUnified/1.0 (+https://localhost)",
        },
    });

    return parser.parseURL(url);
}

export async function fetchProductHuntSeed(context: UnifiedPlatformContext): Promise<RawScrapedItem[]> {
    const topic = context.seed.trim().toLowerCase().replace(/\s+/g, "-");
    const maxItems = Math.max(1, context.input.maxItemsPerPlatform ?? 50);

    const topicFeed =
        topic === "all" || topic === "home" ? "https://www.producthunt.com/feed" : `https://www.producthunt.com/topics/${topic}/feed.rss`;

    let feed;
    try {
        feed = await parseFeed(topicFeed);
    } catch {
        feed = await parseFeed("https://www.producthunt.com/feed");
    }

    return (feed.items || []).slice(0, maxItems).map((item) => ({
        platform: "producthunt",
        sourceName: topic === "all" || topic === "home" ? "ProductHunt" : `ProductHunt:${topic}`,
        sourceId: item.guid || item.id || item.link || `${topic}:${item.title || "untitled"}`,
        title: item.title || "Untitled",
        body: (item.contentSnippet || item.content || "").replace(/\s+/g, " ").trim(),
        url: item.link || undefined,
        author: item.creator || item.author || undefined,
        createdAt: item.isoDate ? new Date(item.isoDate) : undefined,
        metadata: { topic },
    }));
}
