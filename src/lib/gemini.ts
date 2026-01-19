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
