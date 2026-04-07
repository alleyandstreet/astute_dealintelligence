import { GoogleGenerativeAI } from "@google/generative-ai";
import { normalizeDateToYmd } from "@/lib/date-utils";

// Model gemini-2.5-flash is confirmed available and working with the new 'googleSearch' tool name
const MODEL_NAME = "gemini-2.5-flash";

let cachedModel: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;

export function getGeminiModel() {
  if (cachedModel) return cachedModel;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  cachedModel = genAI.getGenerativeModel({
    model: MODEL_NAME,
    tools: [
      {
        // @ts-ignore - Using the updated Google Search tool name for newer Gemini versions
        googleSearch: {
          // Dynamic retrieval is optional but helps with accuracy
          /* dynamicRetrievalConfig: {
            mode: "DYNAMIC",
            dynamicThreshold: 0.3
          } */
        }
      }
    ] as any
  }, { apiVersion: "v1beta" });

  return cachedModel;
}

// Backward-compatible shim for existing routes that import `model`.
export const model = {
  generateContent: (...args: any[]) => (getGeminiModel() as any).generateContent(...args),
};

// ==========================================
// PRODUCT HUNT TOOLS
// ==========================================

export interface ProductHuntGroundedListing {
  name: string;
  tagline: string;
  upvotes: number;
  productHuntUrl: string;
  productWebsiteUrl: string;
  makerNames: string[];
  contactLinks: {
    twitter?: string;
    linkedin?: string;
    website?: string;
    email?: string;
  };
  categories: string[];
  sourceDate?: string;
}

/**
 * Cross-verifies the upvote counts for a list of products using Google Search grounding.
 */
export async function verifyProductHuntUpvotes(
    date: string,
    products: { name: string; productHuntUrl: string }[]
): Promise<Map<string, number>> {
    const verifiedMap = new Map<string, number>();
    if (!process.env.GEMINI_API_KEY || products.length === 0) return verifiedMap;

    const productsList = products.map((p) => `- ${p.name} (${p.productHuntUrl})`).join("\n");

    const prompt = `You are a fact-checking agent specializing in Product Hunt data.
Your goal is to verify the FINAL total upvote count for these products on the specific date: ${date}.

Products to verify:
${productsList}

INSTRUCTIONS:
1. Use Google Search grounding to find the final, end-of-day upvote counts for these items on ${date}.
2. Check the Product Hunt leaderboard archives or daily recaps to be 100% sure of the final count.
3. Return ONLY a plain JSON object where:
   - Keys are EXACTLY the Product Hunt URLs or Names provided above (case-insensitive keys are fine).
   - Values are the final confirmed integer upvote counts.
4. If a count cannot be verified for a specific item, do not include it in the JSON.
5. NO chatter, NO markdown code blocks, JUST the JSON object.

Example Output:
{
  "https://www.producthunt.com/posts/example": 452,
  "Example Product": 452
}`;

    try {
        const result = await getGeminiModel().generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            for (const [key, value] of Object.entries(parsed)) {
                if (typeof value === "number") {
                    verifiedMap.set(key.toLowerCase(), value);
                }
            }
        }
    } catch (error) {
        console.error("Error verifying upvotes via Gemini:", error);
    }

    return verifiedMap;
}

const PH_GROUNDED_PROMPT = `You are a specialized data extraction agent. 
Your task is to scrape and extract EVERY Product Hunt listing for a specific date using Google Search grounding.

Target Date: {date}
Target URL: https://www.producthunt.com/leaderboard/daily/{date_url}/all

IMPORTANT: Product Hunt leaderboards typically contain 30-50+ products. You MUST extract more than just the top 5. 

INSTRUCTIONS:
1. Use Google Search grounding to access the "Product Hunt Daily Leaderboard" for the target date: {date}.
1b. IMPORTANT: You MUST use the "All" section/tab (NOT "Featured").
1c. The "All" view should include EVERY product launched that day, typically 30-100+ items.
2. CROSS-VERIFICATION REQUIRED: Search results often display "stale" upvote counts from early in the day. You MUST verify the FINAL total count.
3. TRIPLE-CHECK TOP PRODUCTS: For the top 5-10 products (like "Aident AI", "MacBook Neo", "Heywa"), do not trust a single source. Look for the "Finished" rank and the total "Upvoted" count shown on the leaderboard archives at producthunt.com/leaderboard/daily/{date_url}.
4. SPECIFIC SEARCHES: If a count feels low (e.g., under 300 for a #1 product), proactively search for "[Product Name] Product Hunt upvotes total [Date]".
5. DO NOT FILTER BY UPVOTES. Return ALL products for the day; filtering will happen after extraction.
6. DATA EXTRACTION:
   - Full Name
   - Tagline / Description
   - Upvote Count (integer) - CRITICAL: Must be the total final count for that day.
   - Product Hunt URL
   - Actual Product Website URL
   - Names of the Makers/Founders
   - Contact links for the makers (Twitter/X, LinkedIn, Personal Website, Email)
   - Categories/Tags
Return ONLY a valid JSON object. Do not include any pre-amble, chatter, or markdown outside the code block.

Structure:
\`\`\`json
{
  "date": "{date}",
  "sourceDate": "{date}",
  "total_found": number,
  "verification_status": "triple_checked",
  "products": [
    {
      "name": "string",
      "tagline": "string",
      "upvotes": number,
      "productHuntUrl": "string",
      "productWebsiteUrl": "string",
      "makerNames": ["string"],
      "contactLinks": {
        "twitter": "string",
        "linkedin": "string",
        "website": "string",
        "email": "string"
      },
      "categories": ["string"]
    }
  ]
}
\`\`\`
STRICT: The Upvote Count MUST be an integer representing the final total. If you see multiple versions, pick the HIGHEST confirmed one.`;

const PH_GROUNDED_STRICT_APPENDIX = `
CRITICAL DATE GUARANTEE:
- You must confirm the leaderboard page date matches {date}.
- If you cannot verify the date or the leaderboard page for {date_url} does not exist, return:
  { "date": "{date}", "sourceDate": "{date}", "total_found": 0, "verification_status": "date_not_found", "products": [] }
- Do NOT reuse today's leaderboard for past or future dates.
`;

const PH_GROUNDED_RELAXED_APPENDIX = `
DATE RELIABILITY (RELAXED MODE):
- You must still target {date} and confirm it matches the leaderboard date when possible.
- If the official leaderboard page is blocked, use secondary credible sources (archived pages, press recaps, or cached leaderboards) that clearly reference the target date.
- Do NOT reuse today's leaderboard for past or future dates.
- If you cannot find any sources for {date}, return an empty products list with verification_status = "date_not_found".
`;

const PH_GROUNDED_ALL_APPENDIX = `
ALL MODE (MANDATORY):
- You MUST use the /all leaderboard view: https://www.producthunt.com/leaderboard/daily/{date_url}/all
- Do NOT use the Featured tab, and do NOT stop after the first 5-10 items.
- If you see only a small handful of products, assume you're on Featured and retry with /all.
- The output must include EVERY product listed in the All view for {date}.
`;

export async function scrapeProductHuntWithGrounding(
  date: string,
  minUpvotes: number,
  maxUpvotes: number,
  options?: { relaxed?: boolean }
): Promise<{ date: string; total_found: number; products: ProductHuntGroundedListing[] } | null> {
  if (!process.env.GEMINI_API_KEY) return null;

  const [yearRaw, monthRaw, dayRaw] = date.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const dateStr = `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;

  const allowRelaxed = Boolean(options?.relaxed);
  const buildPrompt = (strict: boolean) =>
    (PH_GROUNDED_PROMPT
      + PH_GROUNDED_ALL_APPENDIX
      + (strict ? PH_GROUNDED_STRICT_APPENDIX : allowRelaxed ? PH_GROUNDED_RELAXED_APPENDIX : ""))
      .replace(/{date}/g, date)
      .replace(/{date_url}/g, dateStr)
      .replace(/{min_upvotes}/g, minUpvotes.toString())
      .replace(/{max_upvotes}/g, maxUpvotes.toString());

  const MAX_RETRIES = 2;
  let attempt = 0;

  let strictMode = false;
  while (attempt < MAX_RETRIES) {
    try {
      console.log(`[DEBUG] Prompting Gemini PH Grounding (Attempt ${attempt + 1}): ${dateStr}`);
      const result = await getGeminiModel().generateContent(buildPrompt(strictMode));
      const response = await result.response;
      const text = response.text();

      console.log("[DEBUG] Raw Grounded PH Response Length:", text.length);

      // Robust JSON extraction: Find the first { or [ and the last } or ]
      const firstBrace = text.indexOf("{");
      const lastBrace = text.lastIndexOf("}");
      const firstBracket = text.indexOf("[");
      const lastBracket = text.lastIndexOf("]");

      let cleanJson = "";
      // Case 1: Markdown JSON block (most reliable)
      const mdMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (mdMatch) {
        cleanJson = mdMatch[1];
      } else if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        // Case 2: Standard object
        cleanJson = text.slice(firstBrace, lastBrace + 1);
      } else if (firstBracket !== -1 && lastBracket !== -1) {
        // Case 3: Bare array
        cleanJson = text.slice(firstBracket, lastBracket + 1);
      }

      if (!cleanJson) {
        console.warn(`[WARN] No JSON structure found in response on attempt ${attempt + 1}.`);
        attempt++;
        continue;
      }

      try {
        let parsed = JSON.parse(cleanJson);
        // If it's an array, wrap it in the expected object structure
        if (Array.isArray(parsed)) {
          parsed = { date, total_found: parsed.length, products: parsed };
        }

        if (parsed && parsed.products) {
          const parsedDate = typeof parsed.date === "string" ? parsed.date : "";
          const parsedSourceDate = typeof parsed.sourceDate === "string" ? parsed.sourceDate : "";
          const normalizedParsedDate = parsedDate ? normalizeDateToYmd(parsedDate) : null;
          const normalizedSourceDate = parsedSourceDate ? normalizeDateToYmd(parsedSourceDate) : null;
          if (normalizedParsedDate && normalizedParsedDate !== date) {
            if (!strictMode) {
              console.warn(`[WARN] Grounded PH date mismatch: expected ${date}, got ${parsedDate}. Retrying strict mode.`);
              strictMode = true;
              attempt++;
              continue;
            }
            console.warn(`[WARN] Grounded PH date mismatch after retry: expected ${date}, got ${parsedDate}. Proceeding with requested date.`);
          } else if (parsedDate && !normalizedParsedDate) {
            console.warn(`[WARN] Grounded PH date unparseable: "${parsedDate}". Proceeding with requested date.`);
          }
          if (normalizedSourceDate && normalizedSourceDate !== date) {
            if (!strictMode) {
              console.warn(`[WARN] Grounded PH sourceDate mismatch: expected ${date}, got ${parsedSourceDate}. Retrying strict mode.`);
              strictMode = true;
              attempt++;
              continue;
            }
            console.warn(`[WARN] Grounded PH sourceDate mismatch after retry: expected ${date}, got ${parsedSourceDate}. Proceeding with requested date.`);
          } else if (parsedSourceDate && !normalizedSourceDate) {
            console.warn(`[WARN] Grounded PH sourceDate unparseable: "${parsedSourceDate}". Proceeding with requested date.`);
          }
          if (!strictMode && Array.isArray(parsed.products) && parsed.products.length > 0 && parsed.products.length < 20) {
            console.warn(`[WARN] Grounded PH returned only ${parsed.products.length} products. Retrying in strict mode.`);
            strictMode = true;
            attempt++;
            continue;
          }
          return parsed;
        }
        console.warn("[WARN] Parsed JSON missing 'products' field.");
      } catch (parseError) {
        console.error("JSON Parse Error in Grounded PH:", parseError);
      }

      attempt++;
    } catch (error: any) {
      console.error(`Grounded PH Scrape Error (Attempt ${attempt + 1}):`, error.message || error);
      attempt++;
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }

  return null;
}

const PRODUCTHUNT_ANALYSIS_PROMPT = `You are a micro private equity analyst evaluating a Product Hunt listing for acquisition potential.

Analyze this Product Hunt product and score it based on acquisition readiness and business viability.

Product Title: "{title}"
Product Description: "{content}"
Topic: {topic}
Maker: {maker}

Evaluate based on these criteria:

TRACTION & VALIDATION (0-25 points):
- Upvotes count (estimate from engagement)
- Comment quality and volume
- Awards/badges mentioned
- Time since launch (6-24 months is ideal)

BUSINESS MODEL (0-25 points):
- Clear monetization (SaaS/subscription preferred)
- Pricing structure visible
- B2B vs B2C (B2B scores higher)
- Revenue indicators
- RED FLAG: Lifetime deals = -10 points

PRODUCT QUALITY (0-20 points):
- Professional execution
- Technical sophistication
- Integration ecosystem
- Active development signals

ACQUISITION READINESS (0-30 points):
- Solo founder (more likely to sell)
- Niche specificity (narrow = better)
- Automated/low-maintenance mentioned
- Revenue/metrics shared publicly
- Clear problem-solution fit
- Founder engagement level

Provide analysis in this exact JSON format:
{
  "business_name": "Product name",
  "industry": "SaaS/Developer Tools/Productivity/Marketing/E-commerce/Other",
  "estimated_revenue": "Estimate based on pricing/traction or 'Not mentioned'",
  "revenue_type": "MRR/ARR/One-time/Freemium/Unknown",
  "valuation_range": {
    "min": number (conservative estimate in USD),
    "max": number (optimistic estimate in USD)
  },
  "viability_score": number 0-100 (overall business viability),
  "motivation_score": number 0-100 (likelihood founder would sell),
  "deal_quality": number 0-100 (acquisition attractiveness),
  "risk_flags": ["array of concerns: no monetization, lifetime deals, vague description, etc"],
  "seller_signals": ["array of positive signals: solo founder, metrics shared, niche focus, etc"],
  "contact_info": {
    "reddit": "",
    "website": "extract if mentioned",
    "email": ""
  },
  "ai_summary": "2-3 sentence acquisition thesis focusing on why this would/wouldn't be a good acquisition target",
  "business_type": "Primary category",
  "traction_score": number 0-25,
  "business_model_score": number 0-25,
  "product_quality_score": number 0-20,
  "acquisition_readiness_score": number 0-30
}

SCORING GUIDANCE:
- Tier 1 (Hot Prospect): 80-100 total points
- Tier 2 (Worth Monitoring): 60-79 points  
- Tier 3 (Low Priority): 40-59 points
- Reject only: Below 20 points (obvious non-businesses only)

IMPORTANT: Be VERY generous with scoring. We want to capture as many opportunities as possible.
- Any product with clear monetization should score at least 50
- Any SaaS product should score at least 60
- Only score below 20 if it's clearly not a real business (just an idea, no product, etc.)

Only return valid JSON. No markdown formatting.`;

export async function analyzeProductHuntListing(
  title: string,
  content: string,
  topic: string,
  maker: string
): Promise<DealAnalysis | null> {
  try {
    console.log(`\n🔍 Starting AI analysis for: "${title}"`);

    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY is missing");
      return null;
    }

    const prompt = PRODUCTHUNT_ANALYSIS_PROMPT
      .replace("{title}", title)
      .replace("{content}", content.slice(0, 5000))
      .replace("{topic}", topic)
      .replace("{maker}", maker);

    console.log(`📤 Sending prompt to Gemini (content length: ${content.length} chars)...`);

    const result = await getGeminiModel().generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log(`📥 Received response from Gemini (${text.length} chars)`);
    console.log(`Response preview: ${text.slice(0, 300)}...`);

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("❌ No JSON found in Gemini response for ProductHunt");
      console.error("Full response:", text);
      return null;
    }

    console.log(`✅ Found JSON in response, attempting to parse...`);
    const analysis = JSON.parse(jsonMatch[0]) as DealAnalysis;

    console.log(`✅ Successfully parsed JSON`);
    console.log(`ProductHunt Analysis for "${title}": Quality=${analysis.deal_quality}, Viability=${analysis.viability_score}`);

    if (analysis.deal_quality < 20) {
      console.log(`❌ Rejected low quality (${analysis.deal_quality}/100) for: ${title}`);
      return null;
    }

    console.log(`✅ Analysis passed quality check (${analysis.deal_quality}/100)\n`);
    return analysis;
  } catch (error) {
    console.error("❌ Gemini API error during ProductHunt analysis:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
    }
    return null;
  }
}

// ==========================================
// MARKET INTELLIGENCE ANALYSIS
// ==========================================

const MARKET_ANALYSIS_PROMPT = `You are a Principal Analyst at a top-tier Private Equity firm (e.g., Blackstone, KKR).
Perform a deep-dive due diligence analysis on the provided text or topic.
Input: "{content}"

Your goal is to provide actionable, "analyst-grade" intelligence. Avoid generic fluff. Be specific, critical, and data-driven.

Return a JSON object with this exact structure:
{
  "executive_summary": {
    "thesis": "The core investment thesis (1-2 sentences)",
    "investment_horizon": "Short/Medium/Long Term",
    "market_readiness": "Early/Growth/Mature/Decline"
  },
  "market_dynamics": {
    "market_size": "Total Addressable Market (TAM) estimate with currency",
    "cagr": "Compound Annual Growth Rate estimate",
    "growth_drivers": ["Driver 1", "Driver 2"],
    "hindrances": ["Barrier 1", "Barrier 2"],
    "consumer_behavior": "Key shifts in how customers are buying/using this"
  },
  "competitive_landscape": [
    {
      "name": "Competitor Name",
      "market_share_estimate": number (0-100),
      "strength": "Key advantage",
      "weakness": "Key vulnerability"
    }
  ],
  "strategic_analysis": {
    "swot": {
      "strengths": ["Internal Strength 1", "Internal Strength 2"],
      "weaknesses": ["Internal Weakness 1", "Internal Weakness 2"],
      "opportunities": ["External Opportunity 1", "External Opportunity 2"],
      "threats": ["External Threat 1", "External Threat 2"]
    },
    "pestle": {
      "political": "Regulatory/Political factor",
      "economic": "Economic factor (rates, inflation)",
      "social": "Social trend",
      "technological": "Tech disruption",
      "legal": "Legal risk",
      "environmental": "Sustainability factor"
    }
  },
  "trends": [
    {
      "name": "Trend Name",
      "description": "Deep description",
      "impact": "High/Medium/Low",
      "timeframe": "Near/Mid/Far"
    }
  ],
  "opportunities": [
    {
        "title": "Opportunity",
        "thesis": "Investment Thesis",
        "difficulty": "Easy/Moderate/Hard"
    }
  ],
  "risks": [
    { "risk": "Specific Risk", "impact": "High/Medium/Low", "mitigation": "How to mitigate" }
  ],
  "regulatory_landscape": "Summary of key regulations (GDPR, AI Act, etc.)",
  "ma_activity": "Recent mergers, acquisitions, or consolidation trends",
  "overall_sentiment": "Positive/Neutral/Negative",
  "recommended_action": "Buy/Build/Wait",
  "sentiment_breakdown": [
    { "name": "Positive", "value": number },
    { "name": "Neutral", "value": number },
    { "name": "Negative", "value": number }
  ],
  "growth_scenarios": {
    "bull_case": [
      { "year": "2023", "value": number },
      { "year": "2024", "value": number },
      { "year": "2025", "value": number },
      { "year": "2026", "value": number }
    ],
    "base_case": [
      { "year": "2023", "value": number },
      { "year": "2024", "value": number },
      { "year": "2025", "value": number },
      { "year": "2026", "value": number }
    ],
    "bear_case": [
      { "year": "2023", "value": number },
      { "year": "2024", "value": number },
      { "year": "2025", "value": number },
      { "year": "2026", "value": number }
    ]
  },
  "customer_personas": [
    {
      "role": "e.g. CTO / CFO",
      "pain_points": ["Pain 1", "Pain 2"],
      "willingness_to_pay": "High/Medium/Low"
    }
  ]
}`;

export interface MarketAnalysis {
  executive_summary: {
    thesis: string;
    investment_horizon: string;
    market_readiness: string;
  };
  market_dynamics: {
    market_size: string;
    cagr: string;
    growth_drivers: string[];
    hindrances: string[];
    consumer_behavior: string;
  };
  competitive_landscape: {
    name: string;
    market_share_estimate: number;
    strength: string;
    weakness: string;
  }[];
  strategic_analysis: {
    swot: {
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      threats: string[];
    };
    pestle: {
      political: string;
      economic: string;
      social: string;
      technological: string;
      legal: string;
      environmental: string;
    };
  };
  trends: {
    name: string;
    description: string;
    impact: "High" | "Medium" | "Low";
    timeframe: "Near" | "Mid" | "Far";
  }[];
  opportunities: {
    title: string;
    thesis: string;
    difficulty: "Easy" | "Moderate" | "Hard";
  }[];
  risks: { risk: string; impact: string; mitigation: string }[];
  regulatory_landscape: string;
  ma_activity: string;
  overall_sentiment: "Positive" | "Neutral" | "Negative";
  recommended_action: "Buy" | "Build" | "Wait";
  sentiment_breakdown: { name: string; value: number }[];
  growth_scenarios: {
    bull_case: { year: string; value: number }[];
    base_case: { year: string; value: number }[];
    bear_case: { year: string; value: number }[];
  };
  customer_personas: {
    role: string;
    pain_points: string[];
    willingness_to_pay: "High" | "Medium" | "Low";
  }[];
}

export async function analyzeMarketTrends(content: string): Promise<MarketAnalysis | null> {
  return runGenericAnalysis<MarketAnalysis>(MARKET_ANALYSIS_PROMPT, { content }, "MarketAnalysis");
}

const ANALYST_CHAT_PROMPT = `You are the Principal Analyst who just wrote this market intelligence report.
Context (The Report You Wrote):
{analysis_context}

User Question: "{user_message}"

Answer the user's question based strictly on the report context provided above.
If the answer is not in the report, use your general knowledge but mention that "the specific report doesn't cover this, but generally...".
Keep answers concise, professional, and dense with information.
`;

export async function chatWithAnalyst(analysisContext: any, history: { role: string, content: string }[], userMessage: string): Promise<string> {
  try {
    const chat = getGeminiModel().startChat({
      history: history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }]
      }))
    });

    const prompt = ANALYST_CHAT_PROMPT
      .replace("{analysis_context}", JSON.stringify(analysisContext))
      .replace("{user_message}", userMessage);

    const result = await chat.sendMessage(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Chat error:", error);
    return "I'm having trouble accessing my notes right now. Please ask again.";
  }
}

export interface DealAnalysis {
  business_name: string;
  industry: string;
  estimated_revenue: string;
  revenue_type: string;
  valuation_range: {
    min: number;
    max: number;
  };
  viability_score: number;
  motivation_score: number;
  deal_quality: number;
  risk_flags: string[];
  seller_signals: string[];
  contact_info: {
    reddit?: string;
    website?: string;
    email?: string;
  };
  ai_summary: string;
  business_type: string;
}

const ANALYSIS_PROMPT = `You are a private equity analyst evaluating a Reddit post for potential business acquisition opportunities.

Analyze this Reddit post and extract business intelligence.
STRICT FILTERING: We are ONLY interested in ESTABLISHED BUSINESSES that are potentially FOR SALE or have clear metrics.
REJECT IMPACT:
- "Building in Public" daily/weekly updates -> Score 0
- "My Journey" / "Year in Review" / "Recap" -> Score 0
- "How I built this" (Retrospective without current metrics) -> Score 0
- "Don't give up" posts -> Score 0
- Ideas without a product -> Score 0

Post Title: "{title}"
Post Content: "{content}"
Subreddit: r/{subreddit}
Author: u/{author}

Provide your analysis in this exact JSON format (strict JSON):
{
  "business_name": "Name if mentioned, otherwise 'Unknown Business'",
  "industry": "SaaS/E-commerce/Service/Content/Agency/Other",
  "estimated_revenue": "$X MRR or $X/year or 'Not mentioned'",
  "revenue_type": "MRR/ARR/Annual/Unknown",
  "valuation_range": {
    "min": number (in USD),
    "max": number (in USD)
  },
  "viability_score": number 0-100 (0 if 'journey' or 'motivational' post),
  "motivation_score": number 0-100,
  "deal_quality": number 0-100 (CRITICAL: Return 0 if this is just a personal story/milestone post),
  "risk_flags": ["array of identified risks"],
  "seller_signals": ["array of signals suggesting motivation to sell"],
  "contact_info": {
    "reddit": "u/username",
    "website": "domain if mentioned",
    "email": "email if mentioned"
  },
  "ai_summary": "2-3 sentence investment thesis. If rejected, explain why (e.g. 'Just a journey recap').",
  "business_type": "Primary type: SaaS/E-commerce/Service/Content/Agency"
}

Only return valid JSON. Do not include any markdown formatting like \`\`\`json or introductory text.`;

export async function analyzePost(
  title: string,
  content: string,
  subreddit: string,
  author: string
): Promise<DealAnalysis | null> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is missing");
      return null;
    }

    const prompt = ANALYSIS_PROMPT
      .replace("{title}", title)
      .replace("{content}", content.slice(0, 5000))
      .replace("{subreddit}", subreddit)
      .replace("{author}", author);

    const result = await getGeminiModel().generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in Gemini response");
      return null;
    }

    return JSON.parse(jsonMatch[0]) as DealAnalysis;
  } catch (error) {
    console.error("Gemini API error during analysis:", error);
    return null;
  }
}

export async function generateOutreachMessage(
  dealName: string,
  industry: string,
  revenue: string,
  username: string,
  aiSummary: string
): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return `Hi ${username},\n\nI came across your post about ${dealName} and was impressed by what you've built. I'd love to learn more.`;
    }

    const prompt = `Generate a professional, personalized outreach message for a private equity acquisition opportunity.

Target: u/${username}
Business: ${dealName}
Industry: ${industry}
Revenue: ${revenue}
Context: ${aiSummary}

Write a warm, professional Reddit DM that:
1. Mentions something specific about their business
2. Briefly introduces interest from a PE search fund
3. Proposes a brief call
4. Offers NDA/confidentiality
5. Keeps it under 150 words

Only return the message text, no quotes or formatting.`;

    const result = await getGeminiModel().generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Gemini error generating outreach:", error);
    return `Hi ${username},\n\nI came across your post about ${dealName} and was impressed by what you've built. I work with a private equity search fund focused on ${industry} businesses.\n\nWould you be open to a brief call to learn more? Happy to sign an NDA.`;
  }
}

const INDIEHUSTLE_ANALYSIS_PROMPT = `You are a micro private equity analyst evaluating an IndieHustle (Substack) post for acquisition potential.

Analyze this IndieHustle article and identify any business acquisition opportunities mentioned or featured.

Article Title: "{title}"
Article Content: "{content}"
Author: {author}

IndieHustle posts often feature:
- Indie businesses for sale
- Side hustles with revenue
- Founder stories with exit potential
- Business case studies
- Startup showcases

Evaluate based on these criteria:

BUSINESS VIABILITY (0-35 points):
- Clear revenue model
- Proven traction/metrics
- Sustainable business model
- Market demand signals

ACQUISITION READINESS (0-35 points):
- Solo/small team (easier to acquire)
- Owner motivation signals
- Business is mentioned as "for sale" or owner looking to exit
- Clear contact information
- Operational independence

DEAL QUALITY (0-30 points):
- Revenue multiples reasonable
- Low operational complexity
- Transferable business model
- Growth potential

Provide analysis in this exact JSON format:
{
  "business_name": "Business name if mentioned, otherwise 'Featured Business'",
  "industry": "SaaS/E-commerce/Service/Content/Newsletter/Other",
  "estimated_revenue": "Estimate based on article or 'Not mentioned'",
  "revenue_type": "MRR/ARR/Annual/Unknown",
  "valuation_range": {
    "min": number (conservative estimate in USD),
    "max": number (optimistic estimate in USD)
  },
  "viability_score": number 0-100 (overall business viability),
  "motivation_score": number 0-100 (likelihood owner would sell),
  "deal_quality": number 0-100 (acquisition attractiveness),
  "risk_flags": ["array of concerns"],
  "seller_signals": ["array of positive signals: looking to sell, burnout mentioned, etc"],
  "contact_info": {
    "reddit": "",
    "website": "extract if mentioned",
    "email": "extract if mentioned"
  },
  "ai_summary": "2-3 sentence summary of the opportunity",
  "business_type": "Primary category"
}

SCORING GUIDANCE:
- If article explicitly mentions business for sale: minimum 70 points
- If business has revenue mentioned: minimum 50 points
- If just a case study with no sale signals: 30-40 points
- If not about a specific business: below 20 points

Only return valid JSON. No markdown formatting.`;

export async function analyzeIndieHustleListing(
  title: string,
  content: string,
  author: string
): Promise<DealAnalysis | null> {
  try {
    console.log(`\n🔍 Starting AI analysis for IndieHustle: "${title}"`);

    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY is missing");
      return null;
    }

    const prompt = INDIEHUSTLE_ANALYSIS_PROMPT
      .replace("{title}", title)
      .replace("{content}", content.slice(0, 5000))
      .replace("{author}", author);

    console.log(`📤 Sending prompt to Gemini (content length: ${content.length} chars)...`);

    const result = await getGeminiModel().generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log(`📥 Received response from Gemini (${text.length} chars)`);

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("❌ No JSON found in Gemini response for IndieHustle");
      console.error("Full response:", text);
      return null;
    }

    console.log(`✅ Found JSON in response, attempting to parse...`);
    const analysis = JSON.parse(jsonMatch[0]) as DealAnalysis;

    console.log(`✅ Successfully parsed JSON`);
    console.log(`IndieHustle Analysis for "${title}": Quality=${analysis.deal_quality}, Viability=${analysis.viability_score}`);

    console.log(`✅ Analysis passed quality check (${analysis.deal_quality}/100) (Threshold disabled to capture all)\n`);
    return analysis;
  } catch (error) {
    console.error("❌ Gemini API error during IndieHustle analysis:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
    }
    return null;
  }
}

// ==========================================
// INDIE HACKERS ANALYSIS
// ==========================================

const INDIEHACKERS_ANALYSIS_PROMPT = `You are an acquisition scout looking at an IndieHackers Product listing.
 
 Analyze this product to determine if it is a viable acquisition target.
 
 Product Name: "{title}"
 Product Details (Tagline/Description/Revenue): "{content}"
 Founder: {author}
 
 We are scanning the "Products" database. 
 Look for:
 - Confirmed Revenue (MRR/ARR) mentioned in the details
 - SaaS/Software business models (vs just a blog or newsletter)
 - Signs of finding product-market fit
 - Solo founders
 
 Return JSON (Standard DealAnalysis structure):
 {
   "business_name": "Name",
   "industry": "SaaS/Content/etc",
   "estimated_revenue": "Parse exact $ from details if available",
   "revenue_type": "MRR/ARR",
   "valuation_range": { "min": number, "max": number },
   "viability_score": number 0-100 (High for verified revenue > $0 > $500),
   "motivation_score": number 0-100,
   "deal_quality": number 0-100,
   "risk_flags": [],
   "seller_signals": [],
   "contact_info": { "website": "", "email": "" },
   "ai_summary": "Investment thesis based on product metrics",
   "business_type": "SaaS/etc"
 }
 `;

export async function analyzeIndieHackersPost(title: string, content: string, author: string): Promise<DealAnalysis | null> {
  return runGenericAnalysis<DealAnalysis>(INDIEHACKERS_ANALYSIS_PROMPT, { title, content, author }, "IndieHackers");
}

// ==========================================
// GENERAL TREND ANALYSIS
// ==========================================

const TREND_WATCH_PROMPT = `You are a Futurist and Market Strategist at a premier intelligence firm.
Perform a scan of the current global market landscape and identify the top 5 most impactful industrial trends for 2026.

Focus on:
1. Deep tech / GenAI shifts
2. Macroeconomic and Geopolitical impacts
3. Consumer behavior transformations
4. Vertical-specific breakthroughs

Return a JSON object with this exact structure:
{
  "global_sentiment": "Bullish / Bearish / Neutral / Volatile",
  "featured_insight": "A 1-sentence profound observation about the current market",
  "trends": [
    {
      "id": "unique-slug",
      "name": "Trend Name",
      "description": "2-sentence deep dive",
      "impact": "High / Medium / Low",
      "sentiment": "Positive / Negative / Neutral",
      "growth_rate": "+X% YoY (estimate)",
      "key_players": ["Player 1", "Player 2"],
      "thesis": "Investment thesis: Why this matters for Private Equity"
    }
  ]
}`;

export interface GeneralMarketTrend {
  id: string;
  name: string;
  description: string;
  impact: string;
  sentiment: string;
  growth_rate: string;
  key_players: string[];
  thesis: string;
}

export interface TrendWatchResponse {
  global_sentiment: string;
  featured_insight: string;
  trends: GeneralMarketTrend[];
}

export async function generateGeneralTrends(): Promise<TrendWatchResponse | null> {
  return runGenericAnalysis<TrendWatchResponse>(TREND_WATCH_PROMPT, {}, "GeneralTrendWatch");
}

// ==========================================
// UTILITIES
// ==========================================

//Helper to avoid code duplication
async function runGenericAnalysis<T>(promptTemplate: string, replacements: Record<string, string>, sourceName: string): Promise<T | null> {
  if (!process.env.GEMINI_API_KEY) return null;

  let prompt = promptTemplate;
  for (const [key, value] of Object.entries(replacements)) {
    prompt = prompt.replace(`{${key}}`, (value || "").slice(0, 5000));
  }

  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const result = await getGeminiModel().generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) return null;
      return JSON.parse(jsonMatch[0]) as T;
    } catch (error: any) {
      if (error?.status === 429 || error?.message?.includes("429")) {
        attempt++;
        console.warn(`⚠️ Gemini rate limit (429) for ${sourceName}. Retrying attempt ${attempt}/${MAX_RETRIES} in ${attempt * 2}s...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        continue;
      }

      console.error(`Gemini error for ${sourceName}:`, error);
      if (error.response) {
        console.error("Error response:", JSON.stringify(error.response, null, 2));
      }
      return null;
    }
  }

  console.error(`❌ Failed to analyze ${sourceName} after ${MAX_RETRIES} attempts due to rate limits.`);
  return null;
}
