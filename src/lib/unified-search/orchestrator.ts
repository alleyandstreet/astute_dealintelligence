import { classifyDealCandidate } from "@/lib/unified-search/classifier";
import { dedupeCandidates } from "@/lib/unified-search/dedupe";
import { getFeedbackProfile } from "@/lib/unified-search/feedback";
import { createDedupeKey, canonicalizeTitle, extractDomain } from "@/lib/unified-search/normalize";
import { listPlatformConfigs } from "@/lib/unified-search/platform-config";
import { persistUnifiedDeals } from "@/lib/unified-search/persist";
import { withRetry } from "@/lib/unified-search/retry";
import type {
    DeadLetterEntry,
    FeedbackProfile,
    PlatformRunResult,
    RawScrapedItem,
    UnifiedDealCandidate,
    UnifiedSearchInput,
    UnifiedSearchSummary,
    UnifiedSend,
} from "@/lib/unified-search/types";
import { buildCacheKey, readCache, writeCache } from "@/lib/unified-search/cache";
import { enforceRateLimit } from "@/lib/unified-search/rate-limit";
import { jobManager } from "@/lib/unified-search/job-manager";

interface RunUnifiedSearchOptions {
    input: UnifiedSearchInput;
    send: UnifiedSend;
    userId?: string;
    jobId?: string;
}

function dedupeSeeds(seeds: string[]): string[] {
    const normalized = seeds.map((seed) => seed.trim()).filter(Boolean);
    return [...new Set(normalized)];
}

async function processQueue<T>(
    items: string[],
    worker: (item: string) => Promise<T>,
    concurrency: number,
): Promise<T[]> {
    if (items.length === 0) return [];

    const results: T[] = [];
    let cursor = 0;

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (true) {
            const index = cursor;
            cursor += 1;
            if (index >= items.length) break;

            const item = items[index];
            const result = await worker(item);
            results.push(result);
        }
    });

    await Promise.all(workers);
    return results;
}

function emptyFeedbackProfile(): FeedbackProfile {
    return {
        positiveTokens: new Set<string>(),
        negativeTokens: new Set<string>(),
    };
}

function isNonRetryableSeedError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /\b(403|404)\b/.test(message)
        || /forbidden/i.test(message)
        || /not found/i.test(message)
        || /private subreddit/i.test(message);
}

function toCandidate(item: RawScrapedItem, classification: ReturnType<typeof classifyDealCandidate>): UnifiedDealCandidate {
    return {
        ...item,
        canonicalTitle: canonicalizeTitle(item.title),
        canonicalDomain: extractDomain(item.url),
        dedupeKey: createDedupeKey(item.title, item.url),
        classification,
    };
}

export async function runUnifiedSearch({ input, send, userId, jobId }: RunUnifiedSearchOptions): Promise<UnifiedSearchSummary> {
    if (jobId) {
        jobManager.updateJob(jobId, { status: "running" });
    }

    const configs = listPlatformConfigs(input.platforms);
    const deadLetters: DeadLetterEntry[] = [];
    const platformRuns: PlatformRunResult[] = [];

    const summary: UnifiedSearchSummary = {
        scanned: 0,
        relevant: 0,
        deduped: 0,
        duplicatesRemoved: 0,
        persisted: 0,
        filteredByARR: 0,
        platformRuns,
        deadLetters,
    };

    const feedbackProfile = userId ? await getFeedbackProfile(userId) : emptyFeedbackProfile();

    send({ type: "status", message: "🧠 Unified orchestrator starting" });
    send({ type: "metric", key: "platforms", value: configs.length });

    const perPlatformResults = await Promise.all(
        configs.map(async (config) => {
            const platformStart = Date.now();
            const seeds = dedupeSeeds(input.seeds.length ? input.seeds : config.defaultSeeds);
            const candidates: UnifiedDealCandidate[] = [];

            let scanned = 0;
            let relevant = 0;
            let failedSeeds = 0;

            send({ type: "log", message: `⚙️ ${config.label}: scheduler enqueued ${seeds.length} seed jobs` });

            await processQueue(
                seeds,
                async (seed) => {
                    const cacheKey = buildCacheKey([
                        "unified",
                        config.id,
                        seed,
                        input.query || "",
                        (input.keywords || []).join(","),
                        input.maxItemsPerPlatform || "",
                    ]);

                    let retryCount = 0;
                    try {
                        await enforceRateLimit(`unified:${config.id}`, config.maxRequestsPerMinute);

                        let scraped: RawScrapedItem[] | null = null;
                        if (!input.bypassCache) {
                            scraped = readCache<RawScrapedItem[]>(cacheKey);
                        }

                        if (!scraped) {
                            scraped = await withRetry(
                                () => config.fetcher({ seed, input }),
                                {
                                    retries: 2,
                                    baseDelayMs: 600,
                                    maxDelayMs: 4_000,
                                    shouldRetry: (error) => !isNonRetryableSeedError(error),
                                },
                                (attempt, error) => {
                                    retryCount = attempt;
                                    send({
                                        type: "log",
                                        message: `🔁 ${config.label}:${seed} retry ${attempt} after ${String(error)}`,
                                    });
                                },
                            );

                            writeCache(cacheKey, scraped, config.cacheTtlMs);
                        }

                        scanned += scraped.length;

                        for (const item of scraped) {
                            const classification = classifyDealCandidate(item.title, item.body, input, feedbackProfile);
                            if (!classification.isRelevant) continue;

                            relevant += 1;
                            candidates.push(toCandidate(item, classification));
                        }

                        send({
                            type: "log",
                            message: `✅ ${config.label}:${seed} scanned=${scraped.length} relevant=${candidates.length}`,
                        });
                    } catch (error) {
                        failedSeeds += 1;
                        const reason = error instanceof Error ? error.message : String(error);
                        deadLetters.push({
                            platform: config.id,
                            seed,
                            reason,
                            retryCount,
                        });
                        send({ type: "log", message: `⚠️ ${config.label}:${seed} failed -> DLQ (${reason})` });
                    }
                },
                3,
            );

            const durationMs = Date.now() - platformStart;
            const runResult: PlatformRunResult = {
                platform: config.id,
                scanned,
                relevant,
                failedSeeds,
                durationMs,
            };

            platformRuns.push(runResult);

            summary.scanned += scanned;
            summary.relevant += relevant;

            send({
                type: "metric",
                key: `platform:${config.id}:scanned`,
                value: scanned,
            });
            send({
                type: "metric",
                key: `platform:${config.id}:relevant`,
                value: relevant,
            });

            return candidates;
        }),
    );

    const allCandidates = perPlatformResults.flat();
    const dedupeResult = dedupeCandidates(allCandidates);
    summary.deduped = dedupeResult.deduped.length;
    summary.duplicatesRemoved = dedupeResult.duplicatesRemoved;

    send({
        type: "log",
        message: `🧩 Deduplicated ${allCandidates.length} -> ${summary.deduped} (removed ${summary.duplicatesRemoved})`,
    });

    const persisted = await persistUnifiedDeals(dedupeResult.deduped, {
        minARR: input.minARR,
        maxARR: input.maxARR,
        strictRevenue: input.strictRevenue,
    });

    summary.persisted = persisted.created;
    summary.filteredByARR = persisted.filteredByARR;
    
    send({
        type: "metric",
        key: "dealsCreated",
        value: summary.persisted,
    });

    send({
        type: "status",
        message: `✅ Unified run complete. saved=${summary.persisted}, filteredByARR=${summary.filteredByARR}`,
    });

    return summary;
}
