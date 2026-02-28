import { db } from "@/lib/db";
import type { FeedbackProfile } from "@/lib/unified-search/types";

interface FeedbackDetails {
    verdict: "relevant" | "irrelevant";
    tokens: string[];
}

function normalizeToken(token: string): string {
    return token.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

export function extractTokens(text: string): string[] {
    return (text || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .map(normalizeToken)
        .filter((token) => token.length >= 3)
        .slice(0, 20);
}

export async function getFeedbackProfile(userId: string): Promise<FeedbackProfile> {
    const positiveTokens = new Set<string>();
    const negativeTokens = new Set<string>();

    const logs = await db.activityLog.findMany({
        where: {
            userId,
            action: "unified_feedback",
        },
        orderBy: { createdAt: "desc" },
        take: 200,
    });

    for (const log of logs) {
        if (!log.details) continue;

        let parsed: FeedbackDetails | null = null;
        try {
            parsed = JSON.parse(log.details) as FeedbackDetails;
        } catch {
            continue;
        }

        if (!parsed || !Array.isArray(parsed.tokens)) continue;

        for (const token of parsed.tokens) {
            const normalized = normalizeToken(token);
            if (!normalized || normalized.length < 3) continue;

            if (parsed.verdict === "relevant") {
                positiveTokens.add(normalized);
            } else {
                negativeTokens.add(normalized);
            }
        }
    }

    return { positiveTokens, negativeTokens };
}
