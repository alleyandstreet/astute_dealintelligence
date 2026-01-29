import { GoogleGenerativeAI } from "@google/generative-ai";

// Gemini client - will use GEMINI_API_KEY from environment
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

Analyze this Reddit post and extract business intelligence. If the post is not about selling a business or doesn't contain relevant information, still provide your best assessment.

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
  "viability_score": number 0-100,
  "motivation_score": number 0-100,
  "deal_quality": number 0-100,
  "risk_flags": ["array of identified risks"],
  "seller_signals": ["array of signals suggesting motivation to sell"],
  "contact_info": {
    "reddit": "u/username",
    "website": "domain if mentioned",
    "email": "email if mentioned"
  },
  "ai_summary": "2-3 sentence investment thesis",
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

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extract JSON from response (handling potential markdown)
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

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error("Gemini error generating outreach:", error);
        return `Hi ${username},\n\nI came across your post about ${dealName} and was impressed by what you've built. I work with a private equity search fund focused on ${industry} businesses.\n\nWould you be open to a brief call to learn more? Happy to sign an NDA.`;
    }
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

        const result = await model.generateContent(prompt);
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

        // Very generous threshold - only reject obvious non-businesses
        // Threshold of 20 means we capture almost everything
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

        const result = await model.generateContent(prompt);
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

        // Generous threshold - capture most opportunities
        // if (analysis.deal_quality < 20) {
        //    console.log(`❌ Rejected low quality (${analysis.deal_quality}/100) for: ${title}`);
        //    return null;
        // }

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
