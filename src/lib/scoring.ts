/**
 * Local Deal Scoring Algorithm
 * Uses keyword matching to score deals without requiring external AI APIs
 */

interface ScoringResult {
    viabilityScore: number;
    motivationScore: number;
    dealQuality: number;
    riskFlags: string[];
    sellerSignals: string[];
    industry: string;
    businessType: string;
    estimatedRevenue: string;
    revenueValue: number;
    valuationMin: number;
    valuationMax: number;
    aiSummary: string;
}

// Keyword patterns for scoring
const VIABILITY_PATTERNS = {
    revenue: {
        patterns: [/\$[\d,]+k?\s*(mrr|arr|monthly|revenue)/i, /[\d,]+k?\s*(mrr|arr)/i, /revenue\s*[:=]?\s*\$?[\d,]+/i],
        score: 30
    },
    recurring: {
        patterns: [/recurring\s*revenue/i, /subscription/i, /saas/i, /mrr/i, /arr/i],
        score: 20
    },
    profitable: {
        patterns: [/profitable/i, /profit\s*margin/i, /positive\s*cash/i, /making\s*money/i],
        score: 20
    },
    established: {
        patterns: [/\d+\s*years?\s*(old|running|in\s*business)/i, /established/i, /since\s*20\d\d/i],
        score: 15
    },
    team: {
        patterns: [/team\s*of\s*\d+/i, /employees/i, /contractors/i, /developers/i],
        score: 10
    },
    growth: {
        patterns: [/growing/i, /growth/i, /increasing/i, /doubled/i, /tripled/i],
        score: 5
    }
};

const MOTIVATION_PATTERNS = {
    selling: {
        patterns: [/selling/i, /for\s*sale/i, /looking\s*to\s*sell/i, /want\s*to\s*sell/i, /exit/i],
        score: 40
    },
    burnout: {
        patterns: [/burned?\s*out/i, /burnout/i, /exhausted/i, /tired/i, /overwhelmed/i],
        score: 25
    },
    movingOn: {
        patterns: [/moving\s*on/i, /new\s*project/i, /other\s*opportunities/i, /focusing\s*on/i, /starting\s*something/i],
        score: 20
    },
    valuation: {
        patterns: [/how\s*much.*worth/i, /valuation/i, /what.*business.*worth/i, /pricing.*business/i],
        score: 15
    }
};

const RISK_PATTERNS = [
    { pattern: /seo\s*(traffic|dependent|driven)/i, flag: "SEO-dependent traffic" },
    { pattern: /google\s*(ads?|traffic|dependent)/i, flag: "Google Ads dependent" },
    { pattern: /facebook\s*ads?/i, flag: "Facebook Ads dependent" },
    { pattern: /amazon\s*(fba|seller|dependent)/i, flag: "Amazon platform dependency" },
    { pattern: /single\s*client/i, flag: "Single client dependency" },
    { pattern: /one\s*customer/i, flag: "Customer concentration risk" },
    { pattern: /legal\s*(issue|problem|dispute)/i, flag: "Legal issues mentioned" },
    { pattern: /lawsuit/i, flag: "Lawsuit mentioned" },
    { pattern: /declining/i, flag: "Declining revenue signals" },
    { pattern: /struggling/i, flag: "Business struggling" },
    { pattern: /competitor/i, flag: "Competition concerns" },
];

const INDUSTRY_PATTERNS = [
    { pattern: /saas|software\s*as\s*a\s*service/i, industry: "SaaS", multiplier: [3, 5] },
    { pattern: /ecommerce|e-commerce|shopify|amazon\s*fba/i, industry: "E-commerce", multiplier: [2, 4] },
    { pattern: /agency|marketing|seo\s*agency|web\s*design/i, industry: "Agency", multiplier: [1.5, 3] },
    { pattern: /content|blog|newsletter|media/i, industry: "Content/Media", multiplier: [2, 3] },
    { pattern: /service|consulting|freelance/i, industry: "Service", multiplier: [1, 3] },
    { pattern: /app|mobile|ios|android/i, industry: "Mobile App", multiplier: [2, 4] },
];

function extractRevenue(text: string): { display: string; value: number } {
    // Try to extract MRR/ARR values
    const mrrMatch = text.match(/\$?([\d,]+)k?\s*(mrr)/i);
    if (mrrMatch && mrrMatch[1]) {
        let value = parseInt(mrrMatch[1].replace(/,/g, ""));
        if (mrrMatch[1].toLowerCase().includes("k") || value < 100) value *= 1000;
        return { display: `$${value.toLocaleString()} MRR`, value: value * 12 };
    }

    const arrMatch = text.match(/\$?([\d,]+)k?\s*(arr)/i);
    if (arrMatch && arrMatch[1]) {
        let value = parseInt(arrMatch[1].replace(/,/g, ""));
        if (arrMatch[1].toLowerCase().includes("k") || value < 100) value *= 1000;
        return { display: `$${value.toLocaleString()} ARR`, value };
    }

    const revenueMatch = text.match(/revenue[:\s]*\$?([\d,]+)k?/i);
    if (revenueMatch && revenueMatch[1]) {
        let value = parseInt(revenueMatch[1].replace(/,/g, ""));
        if (value < 100) value *= 1000;
        return { display: `$${value.toLocaleString()}/year`, value };
    }

    return { display: "Not mentioned", value: 0 };
}

function detectIndustry(text: string): { industry: string; businessType: string; multiplier: [number, number] } {
    for (const pattern of INDUSTRY_PATTERNS) {
        if (pattern.pattern.test(text)) {
            return {
                industry: pattern.industry,
                businessType: pattern.industry,
                multiplier: pattern.multiplier as [number, number]
            };
        }
    }
    return { industry: "Other", businessType: "General Business", multiplier: [1.5, 3] };
}

function generateSummary(
    title: string,
    industry: string,
    revenue: string,
    viabilityScore: number,
    motivationScore: number,
    sellerSignals: string[]
): string {
    const quality = viabilityScore >= 70 ? "promising" : viabilityScore >= 50 ? "potential" : "early-stage";
    const motivation = motivationScore >= 60 ? "appears motivated to sell" : "may be open to discussions";
    const signalText = sellerSignals.length > 0 ? ` Key signals: ${sellerSignals.slice(0, 2).join(", ")}.` : "";

    return `${quality.charAt(0).toUpperCase() + quality.slice(1)} ${industry.toLowerCase()} opportunity with ${revenue}. Owner ${motivation}.${signalText}`;
}

export function scorePost(title: string, content: string, subreddit: string): ScoringResult {
    // Handle null/undefined inputs and ensure they are strings
    const safeTitle = (title || "").toString();
    const safeContent = (content || "").toString();
    const safeSubreddit = (subreddit || "").toString();
    const fullText = `${safeTitle} ${safeContent}`.toLowerCase();

    // Calculate viability score
    let viabilityScore = 0;
    for (const [, config] of Object.entries(VIABILITY_PATTERNS)) {
        for (const pattern of config.patterns) {
            if (pattern.test(fullText)) {
                viabilityScore += config.score;
                break;
            }
        }
    }
    viabilityScore = Math.min(viabilityScore, 100);

    // Calculate motivation score
    let motivationScore = 0;
    const sellerSignals: string[] = [];
    for (const [key, config] of Object.entries(MOTIVATION_PATTERNS)) {
        for (const pattern of config.patterns) {
            if (pattern.test(fullText)) {
                motivationScore += config.score;
                sellerSignals.push(key.replace(/([A-Z])/g, " $1").toLowerCase().trim());
                break;
            }
        }
    }
    motivationScore = Math.min(motivationScore, 100);

    // Detect risk flags
    const riskFlags: string[] = [];
    for (const risk of RISK_PATTERNS) {
        if (risk.pattern.test(fullText)) {
            riskFlags.push(risk.flag);
        }
    }

    // Extract revenue and industry
    const revenue = extractRevenue(fullText);
    const industryInfo = detectIndustry(fullText);

    // Calculate valuation based on revenue and industry multiplier
    let valuationMin = 0;
    let valuationMax = 0;
    if (revenue.value > 0) {
        valuationMin = Math.round(revenue.value * industryInfo.multiplier[0]);
        valuationMax = Math.round(revenue.value * industryInfo.multiplier[1]);
    }

    // Calculate overall deal quality
    const dealQuality = Math.round((viabilityScore * 0.6) + (motivationScore * 0.4));

    // Generate summary
    const aiSummary = generateSummary(
        title,
        industryInfo.industry,
        revenue.display,
        viabilityScore,
        motivationScore,
        sellerSignals
    );

    return {
        viabilityScore,
        motivationScore,
        dealQuality,
        riskFlags,
        sellerSignals,
        industry: industryInfo.industry,
        businessType: industryInfo.businessType,
        estimatedRevenue: revenue.display,
        revenueValue: revenue.value,
        valuationMin,
        valuationMax,
        aiSummary
    };
}

// Keywords that indicate a business-related post
const RELEVANCE_KEYWORDS = [
    "selling", "exit", "mrr", "arr", "revenue", "profitable", "business",
    "saas", "ecommerce", "agency", "service", "startup", "side project",
    "acquisition", "buyer", "valuation", "bootstrap", "indie"
];

// Keywords that often indicate thoughts, opinions, or general advice rather than a deal
const IRRELEVANCE_INDICATORS = [
    "mental model", "lessons learned", "advice", "thoughts on", "opinion",
    "guide", "how to", "mistakes to avoid", "my story", "my journey",
    "what is", "why you should", "top tips", "best way to", "should not be"
];

// Keywords that strongly indicate a commercial deal/transaction
const COMMERCIAL_SIGNALS = [
    "selling", "for sale", "looking to sell", "acquisition", "exit",
    "buy my business", "valuation", "takeover", "dm me if interested"
];

export function isRelevantPost(title: string, content: string, keywords: string[]): boolean {
    const safeTitle = (title || "").toString();
    const safeContent = (content || "").toString();
    const safeKeywords = Array.isArray(keywords) ? keywords : [];
    const fullText = `${safeTitle} ${safeContent}`.toLowerCase();

    // 1. Check for Irrelevance Indicators (Negative filtering)
    // If a post has too many fluff/advice indicators, it's likely not a business for sale
    let negativePoints = 0;
    for (const indicator of IRRELEVANCE_INDICATORS) {
        if (fullText.includes(indicator)) {
            negativePoints++;
        }
    }

    // If strongly an opinion/advice post, reject it immediately unless there's a huge commercial signal
    if (negativePoints >= 2) {
        let hasHardSignal = false;
        for (const signal of COMMERCIAL_SIGNALS) {
            if (fullText.includes(signal)) {
                hasHardSignal = true;
                break;
            }
        }
        if (!hasHardSignal) return false;
    }

    // 2. Check user-provided keywords (Highest priority)
    for (const keyword of safeKeywords) {
        if (keyword && typeof keyword === 'string') {
            const normalizedKeyword = keyword.toLowerCase().trim();
            if (normalizedKeyword && fullText.includes(normalizedKeyword)) {
                return true;
            }
        }
    }

    // 3. Strict Relevance Check
    // We look for a combination of "Commercial signals" and "Relevance Keywords"
    let commercialMatch = false;
    for (const signal of COMMERCIAL_SIGNALS) {
        if (fullText.includes(signal)) {
            commercialMatch = true;
            break;
        }
    }

    let relevanceMatchCount = 0;
    for (const keyword of RELEVANCE_KEYWORDS) {
        if (fullText.includes(keyword)) {
            relevanceMatchCount++;
        }
    }

    // A relevant deal must either:
    // a) Have a strong commercial signal AND at least one relevant keyword
    // b) Have 3 or more relevant keywords (signals a deep business discussion)
    if (commercialMatch && relevanceMatchCount >= 1) return true;
    if (relevanceMatchCount >= 3) return true;

    return false;
}
