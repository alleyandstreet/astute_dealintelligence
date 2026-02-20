import { NextRequest, NextResponse } from "next/server";
import { model } from "@/lib/gemini";

export async function POST(req: NextRequest) {
    try {
        const { topic } = await req.json();

        if (!topic) {
            return NextResponse.json({ error: "Topic is required" }, { status: 400 });
        }

        // We will perform a search and then distill it
        // Note: In this environment, I (Antigravity) can use search_web, 
        // but for the app's runtime, we use a prompt that instructs the AI to use its internal knowledge 
        // of current trends as of 2026.

        const TRENDS_2026 = `
        GROUND TRUTH: VIRAL TRENDS 2026
        1. AI-Personalization: Algorithms prioritize content that feels tailored to an individual emotion or contextual engagement pattern.
        2. Search-First Social: Users use LinkedIn/Reels as search engines. SEO-optimization within posts is critical.
        3. Practitioner-Creators: Real experts (builders/founders) outperforming brand handles. Humanity is the premium.
        4. Serialized Credibility: Long-form deep dives making a comeback via serialized short clips.
        5. Community-Driven Growth: Micro-communities are the new virality.
        
        DOMAIN CONTEXT (TRUSTMRR.COM):
        - A verified SaaS revenue database and acquisition marketplace.
        - Provides "Proof of Revenue" via direct Stripe/payment provider sync.
        - High-value for "Reviewing realistic, profitable micro-SaaS" content.
        `;

        const PROMPT = `
        You are the "Astute Research Agent." Your goal is to surface viral intelligence for the topic: "${topic}".
        
        ${TRENDS_2026}

        ENTITY DISCOVERY LOGIC:
        - If the prompt mentions a specific site (e.g. TRUSTMRR), database, or domain, switch to "Deep Discovery Mode".
        - Deep Discovery Goal: Identify a SPECIFIC, REALISTIC example or small-batch of entities (businesses/tools/trends) from that resource.
        - Do not provide a general meta-review of the site. Review the DATA within the site.

        Perform a "Chain of Thought" discovery process:
        1. ANALYZE: What is the current sentiment of this topic in 2026? If Deep Discovery, name the specific entity/business you are focusing on from the resource.
        2. DISCOVER: What are the 3 most successful 'Pattern Interrupts' used for this specific niche/entity right now?
        3. BLUEPRINT: Create a viral strategy based on "Authentic Practitioner" or "Transparency-Data" positioning.

        Return exactly THIS JSON structure:
        {
            "thinking": "Explain your discovery path. (e.g. 'Identified [Business Name] on TrustMRR with $12k MRR... analyzing its growth moat.')",
            "analysis": "A deep dive into why this specific discovered entity or topic is viral in 2026.",
            "trendingHooks": [
                { "hook": "...", "type": "Authority/Conflict/Benefit", "avgEngagement": "High/Scale" }
            ],
            "viralGeometry": {
                "peakRetentionTime": "0:12",
                "optimalFormat": "Talking Head + Case Study Overlay"
            },
            "lastUpdated": "February 2026"
        }
        `;

        const result = await model.generateContent(PROMPT);
        const response = await result.response;
        let text = response.text();

        // Extract JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in AI response");

        const data = JSON.parse(jsonMatch[0]);
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Surf error:", error);
        return NextResponse.json({ error: error.message || "Failed to surf for insights" }, { status: 500 });
    }
}
