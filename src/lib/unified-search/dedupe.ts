import type { DedupedDeal, UnifiedDealCandidate } from "@/lib/unified-search/types";

function tokenSet(value: string): Set<string> {
    return new Set(
        value
            .toLowerCase()
            .split(/\s+/)
            .map((token) => token.trim())
            .filter((token) => token.length > 1),
    );
}

function jaccardSimilarity(a: string, b: string): number {
    const setA = tokenSet(a);
    const setB = tokenSet(b);
    if (!setA.size && !setB.size) return 1;

    let intersection = 0;
    for (const token of setA) {
        if (setB.has(token)) intersection += 1;
    }

    const union = new Set([...setA, ...setB]).size;
    if (union === 0) return 0;
    return intersection / union;
}

function sameEntity(a: UnifiedDealCandidate, b: UnifiedDealCandidate): boolean {
    if (a.dedupeKey === b.dedupeKey) return true;

    const similarity = jaccardSimilarity(a.canonicalTitle, b.canonicalTitle);

    if (a.canonicalDomain && b.canonicalDomain && a.canonicalDomain === b.canonicalDomain) {
        return similarity >= 0.6;
    }

    return similarity >= 0.85;
}

export function dedupeCandidates(candidates: UnifiedDealCandidate[]): {
    deduped: DedupedDeal[];
    duplicatesRemoved: number;
} {
    const sorted = [...candidates].sort((a, b) => b.classification.confidence - a.classification.confidence);
    const clusters: DedupedDeal[] = [];

    for (const candidate of sorted) {
        let matchedCluster: DedupedDeal | null = null;

        for (const cluster of clusters) {
            if (sameEntity(cluster.primary, candidate)) {
                matchedCluster = cluster;
                break;
            }
        }

        if (!matchedCluster) {
            clusters.push({
                id: `${candidate.platform}:${candidate.sourceId}`,
                primary: candidate,
                duplicates: [],
                platforms: [candidate.platform],
                confidence: candidate.classification.confidence,
                arrEstimate: candidate.classification.arrEstimate,
            });
            continue;
        }

        matchedCluster.duplicates.push(candidate);
        if (!matchedCluster.platforms.includes(candidate.platform)) {
            matchedCluster.platforms.push(candidate.platform);
        }

        if (candidate.classification.confidence > matchedCluster.confidence) {
            matchedCluster.primary = candidate;
            matchedCluster.confidence = candidate.classification.confidence;
        }

        if (!matchedCluster.arrEstimate && candidate.classification.arrEstimate) {
            matchedCluster.arrEstimate = candidate.classification.arrEstimate;
        }
    }

    const duplicatesRemoved = candidates.length - clusters.length;
    return { deduped: clusters, duplicatesRemoved };
}
