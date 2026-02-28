const STOP_WORDS = new Set([
    "a",
    "an",
    "and",
    "the",
    "for",
    "to",
    "of",
    "on",
    "in",
    "at",
    "with",
    "my",
    "your",
    "our",
    "is",
    "are",
    "this",
    "that",
    "from",
    "by",
    "as",
]);

export function canonicalizeTitle(title: string): string {
    return (title || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
        .slice(0, 12)
        .join(" ");
}

export function extractDomain(url?: string): string | null {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        return parsed.hostname.replace(/^www\./, "").toLowerCase();
    } catch {
        return null;
    }
}

function parseAmount(raw: string): number | null {
    const cleaned = raw.replace(/,/g, "").trim().toLowerCase();
    const numeric = parseFloat(cleaned.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(numeric)) return null;

    let multiplier = 1;
    if (cleaned.includes("k")) multiplier = 1_000;
    if (cleaned.includes("m")) multiplier = 1_000_000;
    if (cleaned.includes("b")) multiplier = 1_000_000_000;

    return numeric * multiplier;
}

export function extractARRFromText(text: string): { arr: number | null; hint: string | null } {
    const haystack = (text || "").toLowerCase();

    const arrRegexes = [
        /\$?([\d,.]+\s*[kmb]?)\s*(arr|annual recurring revenue)/i,
        /(arr|annual recurring revenue)\s*[:=\-]?\s*\$?([\d,.]+\s*[kmb]?)/i,
    ];

    for (const regex of arrRegexes) {
        const match = haystack.match(regex);
        if (match) {
            const amountGroup = match[1] && /\d/.test(match[1]) ? match[1] : match[2];
            const value = parseAmount(amountGroup || "");
            if (value && value > 0) {
                return { arr: Math.round(value), hint: "ARR" };
            }
        }
    }

    const mrrRegexes = [
        /\$?([\d,.]+\s*[kmb]?)\s*(mrr|monthly recurring revenue)/i,
        /(mrr|monthly recurring revenue)\s*[:=\-]?\s*\$?([\d,.]+\s*[kmb]?)/i,
    ];

    for (const regex of mrrRegexes) {
        const match = haystack.match(regex);
        if (match) {
            const amountGroup = match[1] && /\d/.test(match[1]) ? match[1] : match[2];
            const value = parseAmount(amountGroup || "");
            if (value && value > 0) {
                return { arr: Math.round(value * 12), hint: "MRR" };
            }
        }
    }

    const yearlyRevenueMatch = haystack.match(/\$?([\d,.]+\s*[kmb]?)\s*(year|annual|yr)\s*(revenue|rev)?/i);
    if (yearlyRevenueMatch) {
        const value = parseAmount(yearlyRevenueMatch[1]);
        if (value && value > 0) {
            return { arr: Math.round(value), hint: "Annual Revenue" };
        }
    }

    const monthlyRevenueMatch = haystack.match(/\$?([\d,.]+\s*[kmb]?)\s*(month|mo)\s*(revenue|rev)?/i);
    if (monthlyRevenueMatch) {
        const value = parseAmount(monthlyRevenueMatch[1]);
        if (value && value > 0) {
            return { arr: Math.round(value * 12), hint: "Monthly Revenue" };
        }
    }

    return { arr: null, hint: null };
}

export function createDedupeKey(title: string, url?: string): string {
    const canonicalTitle = canonicalizeTitle(title);
    const domain = extractDomain(url);
    if (domain) {
        return `${domain}::${canonicalTitle}`;
    }
    return canonicalTitle;
}
