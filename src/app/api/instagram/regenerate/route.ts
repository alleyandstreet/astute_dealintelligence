import { model } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { topic, platform, style, currentCaption } = await req.json();

        if (!topic || !platform || !style) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const SYSTEM_PROMPT = `
        You are an expert Social Media Content Strategist.
        
        INPUT TOPIC: "${topic}"
        TARGET PLATFORM: ${platform}
        TARGET STYLE: ${style}
        
        TASK: Regenerate a SINGLE social media post variation.
        The user didn't like the previous version, so try a slightly different angle or hook while keeping the same "Style".
        
        OUTPUT FORMAT: Strict JSON only.
        {
            "title": "${style}", // Keep this exact title
            "caption": "New caption text...",
            "hashtags": ["#tag1", "#tag2"]
        }
        
        IMPORTANT:
        - Maintain the specific voice/tone of the requested "${style}".
        - Platform Best Practices:
            - LinkedIn: Professional, strong hook, spacing.
            - Instagram: Visual, engaging, emojis.
            - Twitter: Punchy, under 280 chars (or thread starter).
            - Threads: Conversational.
            - Facebook: Community focused.
        `;

        const result = await model.generateContent(SYSTEM_PROMPT);
        const response = await result.response;
        let text = response.text();

        // Clean markdown and extract JSON
        let textClean = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const start = textClean.indexOf("{");
        const end = textClean.lastIndexOf("}");

        if (start === -1 || end === -1) throw new Error("No JSON found");

        const jsonString = textClean.substring(start, end + 1);
        const jsonContent = JSON.parse(jsonString);

        return NextResponse.json({ variation: jsonContent });

    } catch (error: any) {
        console.error("Regeneration Error:", error);
        return NextResponse.json({ error: error.message || "Regeneration failed" }, { status: 500 });
    }
}
