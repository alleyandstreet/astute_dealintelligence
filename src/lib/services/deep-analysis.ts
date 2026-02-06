import { model } from "../gemini";

export interface InvestmentMemo {
  executive_summary: string;
  market_analysis: {
    tam_sam_som: string;
    growth_trends: string[];
    competitors: string[];
  };
  swot_analysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  risk_assessment: {
    technical_risk: string;
    market_risk: string;
    execution_risk: string;
    overall_risk_score: number; // 1-10
  };
  strategic_recommendation: {
    action: "ACQUIRE" | "WATCH" | "PASS";
    reasoning: string;
    suggested_offer_range: string;
  };
}

const MEMO_PROMPT = `You are a senior Private Equity Investment Analyst. Write a detailed Investment Memo for the following business opportunity.

**Deal Context**:
{context}

**Instructions**:
- Be critical and realistic. Do not be overly optimistic.
- Focus on actionable insights for an acquirer.
- Analyze the market potential and competition.
- Assess risks thoroughly.

**Output Format**:
Return ONLY a valid JSON object matching this structure:
{
  "executive_summary": "High-level overview (2-3 sentences)",
  "market_analysis": {
    "tam_sam_som": "Estimates of market size",
    "growth_trends": ["trend1", "trend2"],
    "competitors": ["competitor1", "competitor2"]
  },
  "swot_analysis": {
    "strengths": ["s1", "s2"],
    "weaknesses": ["w1", "w2"],
    "opportunities": ["o1", "o2"],
    "threats": ["t1", "t2"]
  },
  "risk_assessment": {
    "technical_risk": "Low/Medium/High + explain",
    "market_risk": "Low/Medium/High + explain",
    "execution_risk": "Low/Medium/High + explain",
    "overall_risk_score": number (1-10, 10=Riskiest)
  },
  "strategic_recommendation": {
    "action": "ACQUIRE" | "WATCH" | "PASS",
    "reasoning": "Justification",
    "suggested_offer_range": "$X - $Y"
  }
}`;

export const DeepAnalysisService = {
  async generateMemo(dealContext: string): Promise<InvestmentMemo | null> {
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        const prompt = MEMO_PROMPT.replace("{context}", dealContext);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error("Deep Analysis: No JSON found in response");
          // If no JSON is found, it's a parsing failure, so we break and use fallback
          break;
        }

        return JSON.parse(jsonMatch[0]) as InvestmentMemo;
      } catch (error: any) {
        if (error?.status === 429 || error?.message?.includes("429")) {
          attempt++;
          console.warn(`⚠️ Deep Dive rate limit (429). Retrying attempt ${attempt}/${MAX_RETRIES} in ${attempt * 2}s...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          continue;
        }
        console.error("Deep Analysis Failed:", error);
        // Try fallback immediately on non-retryable error
        break;
      }
    }

    console.warn("⚠️ AI Deep Analysis failed, generating fallback memo.");
    return this.generateFallbackMemo(dealContext);
  },

  generateFallbackMemo(context: string): InvestmentMemo {
    // Extract basic info from context string
    const titleMatch = context.match(/Title: (.*)/);
    const revenueMatch = context.match(/Revenue: (.*)/);
    const industryMatch = context.match(/Industry: (.*)/);
    const name = titleMatch ? titleMatch[1].trim() : "Target Company";
    const revenue = revenueMatch ? revenueMatch[1].trim() : "Undisclosed";
    const industry = industryMatch ? industryMatch[1].trim() : "Tech";

    return {
      executive_summary: `${name} is a ${industry} business with reported revenue of ${revenue}. This memo serves as a preliminary evaluation based on available listing data.`,
      market_analysis: {
        tam_sam_som: "Market sizing requires further due diligence. The sector shows steady demand.",
        growth_trends: ["Digital Transformation", "Remote Work Adoption", "SaaS Consolidation"],
        competitors: ["Competitor analysis pending details"]
      },
      swot_analysis: {
        strengths: ["Existing Revenue/Traction", "Established Product", "Defined Niche"],
        weaknesses: ["Limited public financial history", "Operational dependencies unknown"],
        opportunities: ["Expansion into adjacent markets", "Pricing optimization", "Marketing automation"],
        threats: ["Competitive market saturation", "Platform risk"]
      },
      risk_assessment: {
        technical_risk: "Low - Assumed standard stack",
        market_risk: "Medium - Competitive landscape",
        execution_risk: "Medium - Transferability to be verified",
        overall_risk_score: 5
      },
      strategic_recommendation: {
        action: "WATCH",
        reasoning: "The asset shows promise but requires verifying revenue claims and technical debt before a formal offer.",
        suggested_offer_range: "3x - 4x SDE (Pending Validation)"
      }
    };
  }
};
