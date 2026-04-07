import { NextRequest, NextResponse } from "next/server";
import { model } from "@/lib/gemini";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const { response } = await requireAuth({
        feature: "content_engine",
        rateLimitKey: "content_engine_requests",
    });
    if (response) return response;

    try {
        const { prompt, format, persona = "Professional" } = await req.json();

        if (!prompt || !format) {
            return NextResponse.json({ error: "Prompt and Format are required" }, { status: 400 });
        }

        const SYSTEM_PROMPT = `
        You are a Content Architect. 
        TASK: Transform this idea into a structured ${format}.
        
        IDEA: "${prompt}"
        PERSONA: "${persona}"
        
        STRATEGY RULES (2026):
        - If REEL: High visual density, 3-point value wrap, SEO-optimized text overlays.
        - If LINKEDIN: "Value-Packed Storytelling", avoid corporate speak, focus on practitioner insights.
        - If THREAD: Hook -> The "Why" -> 5-point tactical breakdown -> The "Manifesto".

        Return exactly THIS JSON structure:
        {
            "title": "...",
            "targetAudience": "...",
            "hook": "...",
            "metaData": {
                "estimatedViralScore": 1-100,
                "easeOfProduction": 1-5,
                "seoKeywords": ["keyword1", "keyword2"]
            },
            "structure": [
                { "stage": "...", "visual": "...", "audio": "...", "text": "..." }
            ],
            "cta": "..."
        }
        `;

        const result = await model.generateContent(SYSTEM_PROMPT);
        const response = await result.response;
        let text = response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found");

        const data = JSON.parse(jsonMatch[0]);
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Outline error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
