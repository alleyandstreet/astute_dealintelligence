
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
        const { caption, persona = "Professional" } = await req.json();

        if (!caption) {
            return NextResponse.json({ error: "Caption is required" }, { status: 400 });
        }

        const HOOK_PROMPT = `
        You are an expert Social Media Copywriter specializing in Viral Psychology.
        
        TONE/PERSONA: "${persona}"
        
        TASK: Take the following content/caption idea and generate 10 high-impact "Viral Hooks" (the first sentence) that would stop the scroll.
        
        CONTENT IDEA: "${caption}"
        
        PSYCHOLOGICAL TRIGGERS TO USE:
        1. Curiosity Gap: Start a story but don't finish it.
        2. Negativity Bias: Challenge a common "good" practice.
        3. FOMO: Highlight a window of opportunity closing.
        4. Authority: Quote a surprising stat or high-level insight.
        5. Contrarian: Say the opposite of what everyone expects.
        6. Loss Aversion: What they are losing by NOT doing this.
        7. The "How-To" Twist: How I did X without Y.
        8. The Listicle Hook: X reasons why Y is happening.
        9. The Specific Result: Exactly how we got [Metric].
        10. The Vibe/Relatability: "Anyone else feel like...?"
        
        OUTPUT FORMAT: Strict JSON only.
        {
            "hooks": [
                { "type": "Curiosity", "hook": "...", "explanation": "Why this works..." },
                ...
            ]
        }
        
        RULES:
        - Each hook must be ONE sentence.
        - Ensure the hook matches the "${persona}" persona while being aggressive enough to stop the scroll.
        - Avoid generic "Are you looking for...?" questions.
        `;

        const result = await model.generateContent(HOOK_PROMPT);
        const response = await result.response;
        let text = response.text();

        // Clean markdown and extract JSON
        let textClean = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const start = textClean.indexOf("{");
        const end = textClean.lastIndexOf("}");

        if (start === -1 || end === -1) throw new Error("No JSON found");

        const jsonString = textClean.substring(start, end + 1);
        const jsonContent = JSON.parse(jsonString);

        return NextResponse.json(jsonContent);

    } catch (error: any) {
        console.error("Hook Lab Error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate hooks" }, { status: 500 });
    }
}
