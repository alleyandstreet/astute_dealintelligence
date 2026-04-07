import type { RawScrapedItem, UnifiedPlatformContext } from "@/lib/unified-search/types";
import { fetchJsonWithTimeout, withTimeout } from "@/lib/unified-search/sources/http";

interface RedditListingPost {
    data?: {
        id?: string;
        name?: string;
        title?: string;
        selftext?: string;
        permalink?: string;
        url?: string;
        author?: string;
        created_utc?: number;
        subreddit?: string;
    };
}

interface RedditListingResponse {
    data?: {
        children?: RedditListingPost[];
    };
}

type RssFeedItem = {
    id?: string;
    link?: string;
    title?: string;
    contentSnippet?: string;
    content?: string;
    creator?: string;
    author?: string;
    isoDate?: string;
};

function toErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

function cleanBody(value: string): string {
    return value
        .replace(/<[^>]*>?/gm, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function mapRssItems(subreddit: string, items: RssFeedItem[], maxItems: number): RawScrapedItem[] {
    return (items || []).slice(0, maxItems).map((item) => {
        const body = cleanBody(item.contentSnippet || item.content || "");
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

function mapListingItems(subreddit: string, items: RedditListingPost[], maxItems: number): RawScrapedItem[] {
    return (items || [])
        .slice(0, maxItems)
        .map((entry) => entry.data)
        .filter((post): post is NonNullable<RedditListingPost["data"]> => Boolean(post))
        .map((post) => {
            const permalink = post.permalink || "";
            const link = permalink ? `https://www.reddit.com${permalink}` : post.url;
            const body = cleanBody(post.selftext || "");

            return {
                platform: "reddit",
                sourceName: `r/${subreddit}`,
                sourceId: post.name || post.id || link || `${subreddit}:${post.title || "untitled"}`,
                title: post.title || "Untitled",
                body,
                url: link || undefined,
                author: post.author || undefined,
                createdAt: post.created_utc ? new Date(post.created_utc * 1000) : undefined,
                metadata: { subreddit: post.subreddit || subreddit },
            };
        });
}

async function fetchViaRss(subreddit: string, maxItems: number, userAgent: string): Promise<RawScrapedItem[]> {
    const Parser = (await import("rss-parser")).default;
    const parser = new Parser({
        headers: {
            "User-Agent": userAgent,
            Accept: "application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        },
    });

    const urls = [
        `https://www.reddit.com/r/${subreddit}/new.rss?limit=${maxItems}`,
        `https://old.reddit.com/r/${subreddit}/new.rss?limit=${maxItems}`,
    ];

    let lastError: unknown = null;
    for (const url of urls) {
        try {
            const feed = await withTimeout(
                parser.parseURL(url),
                { timeoutMs: 10000, label: `reddit:rss:${subreddit}` },
            );
            const mapped = mapRssItems(subreddit, (feed.items || []) as RssFeedItem[], maxItems);
            if (mapped.length > 0) {
                return mapped;
            }
        } catch (error) {
            lastError = error;
        }
    }

    if (lastError) {
        throw lastError;
    }

    return [];
}

async function fetchViaListingJson(subreddit: string, maxItems: number, userAgent: string): Promise<RawScrapedItem[]> {
    const urls = [
        `https://www.reddit.com/r/${subreddit}/new.json?limit=${maxItems}&raw_json=1`,
        `https://old.reddit.com/r/${subreddit}/new.json?limit=${maxItems}&raw_json=1`,
    ];

    let lastError: unknown = null;
    for (const url of urls) {
        try {
            const payload = await fetchJsonWithTimeout<RedditListingResponse>(
                url,
                {
                    headers: {
                        "User-Agent": userAgent,
                        Accept: "application/json",
                        "Accept-Language": "en-US,en;q=0.9",
                    },
                },
                { timeoutMs: 12000, label: `reddit:json:${subreddit}` },
            );
            const mapped = mapListingItems(subreddit, payload?.data?.children || [], maxItems);
            if (mapped.length > 0) {
                return mapped;
            }
        } catch (error) {
            lastError = error;
        }
    }

    if (lastError) {
        throw lastError;
    }

    return [];
}

export async function fetchRedditSeed(context: UnifiedPlatformContext): Promise<RawScrapedItem[]> {
    const subreddit = context.seed.replace(/^r\//i, "").trim();
    if (!subreddit) return [];

    const maxItems = Math.max(1, context.input.maxItemsPerPlatform ?? 60);
    const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 AstuteDealIntel/1.0";

    try {
        return await fetchViaRss(subreddit, maxItems, userAgent);
    } catch (rssError) {
        try {
            return await fetchViaListingJson(subreddit, maxItems, userAgent);
        } catch (jsonError) {
            const rssMessage = toErrorMessage(rssError);
            const jsonMessage = toErrorMessage(jsonError);
            throw new Error(`reddit:${subreddit} failed. rss=${rssMessage}; json=${jsonMessage}`);
        }
    }
}
