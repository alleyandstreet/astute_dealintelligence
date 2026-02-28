import { fetchIndieHackersSeed } from "@/lib/unified-search/sources/indiehackers";
import { fetchIndieHustleSeed } from "@/lib/unified-search/sources/indiehustle";
import { fetchProductHuntSeed } from "@/lib/unified-search/sources/producthunt";
import { fetchRedditSeed } from "@/lib/unified-search/sources/reddit";
import type { UnifiedPlatformConfig, UnifiedPlatformId } from "@/lib/unified-search/types";

const configs: Record<UnifiedPlatformId, UnifiedPlatformConfig> = {
    reddit: {
        id: "reddit",
        label: "Reddit",
        maxRequestsPerMinute: 20,
        cacheTtlMs: 3 * 60 * 1000,
        defaultSeeds: ["SaaS", "smallbusiness", "Entrepreneur", "microsaas"],
        fetcher: fetchRedditSeed,
    },
    producthunt: {
        id: "producthunt",
        label: "ProductHunt",
        maxRequestsPerMinute: 30,
        cacheTtlMs: 5 * 60 * 1000,
        defaultSeeds: ["saas", "developer-tools", "productivity"],
        fetcher: fetchProductHuntSeed,
    },
    indiehustle: {
        id: "indiehustle",
        label: "IndieHustle",
        maxRequestsPerMinute: 20,
        cacheTtlMs: 5 * 60 * 1000,
        defaultSeeds: ["saas", "agency", "newsletter"],
        fetcher: fetchIndieHustleSeed,
    },
    indiehackers: {
        id: "indiehackers",
        label: "IndieHackers",
        maxRequestsPerMinute: 20,
        cacheTtlMs: 5 * 60 * 1000,
        defaultSeeds: ["mrr", "for sale", "acquired", "bootstrap"],
        fetcher: fetchIndieHackersSeed,
    },
};

export function getPlatformConfig(id: UnifiedPlatformId): UnifiedPlatformConfig {
    return configs[id];
}

export function listPlatformConfigs(platforms?: UnifiedPlatformId[]): UnifiedPlatformConfig[] {
    if (!platforms || platforms.length === 0) {
        return Object.values(configs);
    }

    return platforms
        .map((platform) => configs[platform])
        .filter((config): config is UnifiedPlatformConfig => Boolean(config));
}
