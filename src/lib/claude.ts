import Anthropic from "@anthropic-ai/sdk";

// Claude client - will use ANTHROPIC_API_KEY from environment
const anthropic = new Anthropic();

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

Provide your analysis in this exact JSON format:
{
  "business_name": "Name if mentioned, otherwise 'Unknown Business'",
  "industry": "SaaS/E-commerce/Service/Content/Agency/Other",
  "estimated_revenue": "$X MRR or $X/year or 'Not mentioned'",
  "revenue_type": "MRR/ARR/Annual/Unknown",
  "valuation_range": {
    "min": number (in USD),
    "max": number (in USD)
  },
  "viability_score": number 0-100 (is this a real, investable business?),
  "motivation_score": number 0-100 (how likely is owner to sell?),
  "deal_quality": number 0-100 (overall opportunity assessment),
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

Valuation Guidelines:
- SaaS: 3-5x ARR
- E-commerce: 2-4x Annual Profit
- Service Business: 1-3x Annual Revenue
- Content/Media: 2-3x Annual Revenue

Viability Score Factors:
- Mentions specific revenue numbers (+30)
- Has recurring revenue (+20)
- Business age > 2 years (+15)
- Profitable (+20)
- Has team/employees (+10)
- Mentions growth (+5)

Motivation Score Factors:
- Mentions "selling" or "exit" (+40)
- Mentions "burned out" or "tired" (+25)
- Mentions "moving on" or "new project" (+20)
- Asking for valuation advice (+15)

Only return valid JSON, no other text.`;

export async function analyzePost(
    title: string,
    content: string,
    subreddit: string,
    author: string
): Promise<DealAnalysis | null> {
    try {
        const prompt = ANALYSIS_PROMPT
            .replace("{title}", title)
            .replace("{content}", content.slice(0, 3000)) // Limit content length
            .replace("{subreddit}", subreddit)
            .replace("{author}", author);

        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1500,
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ]
        });

        const text = response.content[0].type === "text" ? response.content[0].text : "";

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("No JSON found in Claude response");
            return null;
        }

        return JSON.parse(jsonMatch[0]) as DealAnalysis;
    } catch (error) {
        console.error("Claude API error:", error);
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
        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 500,
            messages: [
                {
                    role: "user",
                    content: `Generate a professional, personalized outreach message for a private equity acquisition opportunity.

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

Only return the message text, no quotes or formatting.`
                }
            ]
        });

        return response.content[0].type === "text" ? response.content[0].text : "";
    } catch (error) {
        console.error("Error generating outreach:", error);
        return `Hi ${username},\n\nI came across your post about ${dealName} and was impressed by what you've built. I work with a private equity search fund focused on ${industry} businesses.\n\nWould you be open to a brief call to learn more? Happy to sign an NDA.\n\nBest regards`;
    }
}
