import { NextRequest, NextResponse } from "next/server";
import { generateGeneralTrends } from "@/lib/gemini";
import { requireAuth } from "@/lib/auth";

const MOCK_TRENDS = {
    global_sentiment: "Bullish",
    featured_insight: "The intersection of specialized GenAI and legacy ERP systems is the next multi-billion dollar frontier.",
    trends: [
        {
            id: "vertical-ai",
            name: "Vertical-Specific AI Agents",
            description: "Specialized models for legal, medical, and engineering sectors are outperforming general models.",
            impact: "High",
            sentiment: "Positive",
            growth_rate: "+42% YoY",
            key_players: ["Harvey", "Ambience Healthcare"],
            thesis: "Invest in high-moat specialized datasets."
        }
    ]
};

export async function GET(req: NextRequest) {
    const { response } = await requireAuth({
        feature: "market_intelligence",
        rateLimitKey: "market_intelligence_requests",
    });
    if (response) return response;

    try {
        const trends = await generateGeneralTrends();

        if (!trends) {
            return NextResponse.json({ ...MOCK_TRENDS, source: 'cached' });
        }

        return NextResponse.json({ ...trends, source: 'live' });
    } catch (error) {
        console.error("Error in trends API:", error);
        return NextResponse.json({ ...MOCK_TRENDS, source: 'cached' });
    }
}
