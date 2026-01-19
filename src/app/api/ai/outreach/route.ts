import { NextRequest, NextResponse } from "next/server";
import { generateOutreachMessage } from "@/lib/gemini";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { dealName, industry, revenue, username, aiSummary } = body;

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({
                error: "GEMINI_API_KEY not configured"
            }, { status: 500 });
        }

        const message = await generateOutreachMessage(
            dealName,
            industry,
            revenue,
            username,
            aiSummary
        );

        return NextResponse.json({ message });
    } catch (error) {
        console.error("Outreach API error:", error);
        return NextResponse.json({ error: "Failed to generate message" }, { status: 500 });
    }
}
