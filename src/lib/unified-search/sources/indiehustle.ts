import type { RawScrapedItem, UnifiedPlatformContext } from "@/lib/unified-search/types";
import { fetchJsonWithTimeout } from "@/lib/unified-search/sources/http";

interface IndieHustleArchiveItem {
    id?: string;
    slug?: string;
    title?: string;
    subtitle?: string;
    description?: string;
    canonical_url?: string;
    author_name?: string;
    published_at?: string;
}

export async function fetchIndieHustleSeed(context: UnifiedPlatformContext): Promise<RawScrapedItem[]> {
    const search = context.seed.trim();
    const maxItems = Math.max(1, context.input.maxItemsPerPlatform ?? 60);
    const items: RawScrapedItem[] = [];
    const seen = new Set<string>();

    for (let offset = 0; offset < maxItems; offset += 50) {
        const apiUrl = `https://www.indiehustle.co/api/v1/archive?sort=new&search=${encodeURIComponent(search)}&offset=${offset}&limit=50`;
        const data = await fetchJsonWithTimeout<IndieHustleArchiveItem[]>(
            apiUrl,
            {
                headers: {
                    "User-Agent": "DealIntelUnified/1.0 (+https://alleyandstreet.com)",
                },
            },
            { timeoutMs: 12000, label: `indiehustle:${search}:${offset}` },
        ).catch(() => null);

        if (!Array.isArray(data) || data.length === 0) {
            break;
        }

        for (const post of data) {
            const url = post.canonical_url || (post.slug ? `https://www.indiehustle.co/p/${post.slug}` : undefined);
            if (!url || seen.has(url)) continue;

            seen.add(url);
            items.push({
                platform: "indiehustle",
                sourceName: "IndieHustle",
                sourceId: post.id || post.slug || url,
                title: post.title || "Untitled",
                body: (post.description || post.subtitle || "").replace(/\s+/g, " ").trim(),
                url,
                author: post.author_name || undefined,
                createdAt: post.published_at ? new Date(post.published_at) : undefined,
                metadata: { seed: search },
            });

            if (items.length >= maxItems) {
                return items;
            }
        }
    }

    return items;
}
