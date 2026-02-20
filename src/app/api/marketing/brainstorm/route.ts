import { NextRequest, NextResponse } from "next/server";
import { model } from "@/lib/gemini";

export async function POST(req: NextRequest) {
    try {
        const { context } = await req.json();

        const PROMPT = `
        You are a Creative Strategist. 
        TASK: Generate 12 content "seeds" for a ${context || "Private Equity and Business Intelligence"} firm.
        
        CATEGORIES:
        - Educational (Value)
        - Contrarian (Bold/Debunking)
        - Storytelling (Human/Behind the scenes)
        - Trend-Jacking (Current events)

        OUTPUT FORMAT: JSON only.
        {
            "categories": [
                {
                    "name": "Category Name",
                    "ideas": [
                        { "title": "...", "description": "..." },
                        ...
                    ]
                },
                ...
            ]
        }
        `;

        const result = await model.generateContent(PROMPT);
        const response = await result.response;
        let text = response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found");

        return NextResponse.json(JSON.parse(jsonMatch[0]));

    } catch (error: any) {
        console.error("Brainstorm error:", error);
        return NextResponse.json({ error: "Failed to brainstorm" }, { status: 500 });
    }
}
