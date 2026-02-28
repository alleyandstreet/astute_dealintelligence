import type { RawScrapedItem, UnifiedPlatformContext } from "@/lib/unified-search/types";

export async function fetchRedditSeed(context: UnifiedPlatformContext): Promise<RawScrapedItem[]> {
    const subreddit = context.seed.replace(/^r\//i, "").trim();
    if (!subreddit) return [];

    const Parser = (await import("rss-parser")).default;
    const parser = new Parser({
        headers: {
            "User-Agent": "DealIntelUnified/1.0 (+https://localhost)",
        },
    });

    const feed = await parser.parseURL(`https://www.reddit.com/r/${subreddit}/new.rss?limit=60`);
    const maxItems = Math.max(1, context.input.maxItemsPerPlatform ?? 60);

    return (feed.items || []).slice(0, maxItems).map((item) => {
        const body = (item.contentSnippet || item.content || "")
            .replace(/<[^>]*>?/gm, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        return {
            platform: "reddit",
            sourceName: `r/${subreddit}`,
            sourceId: item.id || item.link || `${subreddit}:${item.title || "untitled"}`,
            title: item.title || "Untitled",
            body,
            url: item.link || undefined,
            author: item.creator || item.author || undefined,
            createdAt: item.isoDate ? new Date(item.isoDate) : undefined,
            metadata: { subreddit },
        };
    });
}
