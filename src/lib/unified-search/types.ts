export type UnifiedPlatformId = "reddit" | "producthunt" | "indiehustle" | "indiehackers";

export interface UnifiedSearchInput {
    query?: string;
    keywords: string[];
    seeds: string[];
    platforms?: UnifiedPlatformId[];
    minARR?: number;
    maxARR?: number;
    minConfidence?: number;
    maxItemsPerPlatform?: number;
    strictRevenue?: boolean;
    bypassCache?: boolean;
}

export interface UnifiedStreamEvent {
    type: "status" | "log" | "metric" | "error" | "complete";
    message?: string;
    key?: string;
    value?: number | string;
    summary?: UnifiedSearchSummary;
}

export type UnifiedSend = (event: UnifiedStreamEvent) => void;

export interface RawScrapedItem {
    platform: UnifiedPlatformId;
    sourceName: string;
    sourceId: string;
    title: string;
    body: string;
    url?: string;
    author?: string;
    createdAt?: Date;
    metadata?: Record<string, unknown>;
}

export interface ClassificationResult {
    isRelevant: boolean;
    confidence: number;
    relevanceScore: number;
    reasons: string[];
    arrEstimate: number | null;
    revenueHint: string | null;
}

export interface UnifiedDealCandidate extends RawScrapedItem {
    canonicalTitle: string;
    canonicalDomain: string | null;
    dedupeKey: string;
    classification: ClassificationResult;
}

export interface DedupedDeal {
    id: string;
    primary: UnifiedDealCandidate;
    duplicates: UnifiedDealCandidate[];
    platforms: UnifiedPlatformId[];
    confidence: number;
    arrEstimate: number | null;
}

export interface DeadLetterEntry {
    platform: UnifiedPlatformId;
    seed: string;
    reason: string;
    retryCount: number;
}

export interface PlatformRunResult {
    platform: UnifiedPlatformId;
    scanned: number;
    relevant: number;
    failedSeeds: number;
    durationMs: number;
}

export interface UnifiedSearchSummary {
    scanned: number;
    relevant: number;
    deduped: number;
    duplicatesRemoved: number;
    persisted: number;
    filteredByARR: number;
    platformRuns: PlatformRunResult[];
    deadLetters: DeadLetterEntry[];
}

export interface UnifiedPlatformContext {
    seed: string;
    input: UnifiedSearchInput;
}

export type UnifiedPlatformFetcher = (
    context: UnifiedPlatformContext,
) => Promise<RawScrapedItem[]>;

export interface UnifiedPlatformConfig {
    id: UnifiedPlatformId;
    label: string;
    maxRequestsPerMinute: number;
    cacheTtlMs: number;
    defaultSeeds: string[];
    fetcher: UnifiedPlatformFetcher;
}

export interface FeedbackProfile {
    positiveTokens: Set<string>;
    negativeTokens: Set<string>;
}
