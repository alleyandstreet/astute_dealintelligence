import { extractARRFromText } from "@/lib/unified-search/normalize";
import type { ClassificationResult, FeedbackProfile, UnifiedSearchInput } from "@/lib/unified-search/types";

const STRONG_DEAL_SIGNALS = [
    "for sale",
    "selling",
    "exit",
    "acquire",
    "acquisition",
    "looking to sell",
    "buyer",
    "business for sale",
    "sell my",
    "micro acquire",
    "take over",
];

const BUSINESS_SIGNALS = [
    "saas",
    "mrr",
    "arr",
    "revenue",
    "profit",
    "profitable",
    "customers",
    "subscribers",
    "churn",
    "retention",
    "stripe",
    "shopify",
    "agency",
    "newsletter",
    "lifetime value",
    "ltv",
];

const OPINION_SIGNALS = [
    "lessons learned",
    "my journey",
    "thoughts on",
    "hot take",
    "guide",
    "how to",
    "what should i",
    "advice",
    "tips",
    "discussion",
    "unpopular opinion",
    "retrospective",
    "year in review",
];

const NOISE_SIGNALS = [
    "hiring",
    "looking for cofounder",
    "job",
    "internship",
    "giveaway",
    "launching soon",
    "open source release",
];

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 500);
}

function hasPhrase(text: string, phrase: string): boolean {
    return text.includes(phrase);
}

function scoreSignals(text: string, signals: string[], weight: number): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    for (const signal of signals) {
        if (hasPhrase(text, signal)) {
            score += weight;
            reasons.push(`${weight > 0 ? "+" : ""}${weight} ${signal}`);
        }
    }

    return { score, reasons };
}

function scoreKeywordHits(text: string, keywords: string[]): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    for (const rawKeyword of keywords) {
        const keyword = rawKeyword.trim().toLowerCase();
        if (!keyword) continue;
        if (hasPhrase(text, keyword)) {
            score += 2;
            reasons.push(`+2 keyword:${keyword}`);
        }
    }

    return { score, reasons };
}

function scoreFeedback(tokens: string[], profile: FeedbackProfile): { score: number; reasons: string[] } {
    if (!profile.positiveTokens.size && !profile.negativeTokens.size) {
        return { score: 0, reasons: [] };
    }

    let score = 0;
    const reasons: string[] = [];
    const uniqueTokens = new Set(tokens);

    for (const token of uniqueTokens) {
        if (profile.positiveTokens.has(token)) {
            score += 1;
            reasons.push(`+1 feedback:${token}`);
        }
        if (profile.negativeTokens.has(token)) {
            score -= 1;
            reasons.push(`-1 feedback:${token}`);
        }
    }

    return { score, reasons };
}

function computeConfidence(rawScore: number): number {
    // Logistic transform keeps score stable around [0,1].
    const confidence = 1 / (1 + Math.exp(-rawScore / 4));
    return Math.max(0, Math.min(1, confidence));
}

export function classifyDealCandidate(
    title: string,
    body: string,
    input: UnifiedSearchInput,
    feedbackProfile: FeedbackProfile,
): ClassificationResult {
    const combined = `${title || ""}\n${body || ""}`.toLowerCase();
    const tokens = tokenize(combined);

    const strong = scoreSignals(combined, STRONG_DEAL_SIGNALS, 4);
    const business = scoreSignals(combined, BUSINESS_SIGNALS, 1);
    const opinions = scoreSignals(combined, OPINION_SIGNALS, -3);
    const noise = scoreSignals(combined, NOISE_SIGNALS, -2);
    const keyword = scoreKeywordHits(combined, input.keywords || []);
    const feedback = scoreFeedback(tokens, feedbackProfile);

    const revenue = extractARRFromText(combined);

    let score = 0;
    score += strong.score + business.score + opinions.score + noise.score + keyword.score + feedback.score;

    if (revenue.arr && revenue.arr > 0) {
        score += 2;
    }

    const confidence = computeConfidence(score);
    const minConfidence = input.minConfidence ?? 0.52;

    const reasons = [
        ...strong.reasons,
        ...business.reasons,
        ...opinions.reasons,
        ...noise.reasons,
        ...keyword.reasons,
        ...feedback.reasons,
    ].slice(0, 12);

    const isRelevant = confidence >= minConfidence && score > 0;

    return {
        isRelevant,
        confidence,
        relevanceScore: score,
        reasons,
        arrEstimate: revenue.arr,
        revenueHint: revenue.hint,
    };
}
