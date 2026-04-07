import { NextResponse } from 'next/server';
import { chatWithAnalyst } from '@/lib/gemini';
import { requireAuth } from "@/lib/auth";

export async function POST(request: Request) {
    const { response } = await requireAuth({
        feature: "market_intelligence",
        rateLimitKey: "market_intelligence_requests",
    });
    if (response) return response;

    try {
        const { analysis, history, message } = await request.json();

        if (!analysis || !message) {
            return NextResponse.json({ error: "Missing analysis context or message" }, { status: 400 });
        }

        const response = await chatWithAnalyst(analysis, history || [], message);
        return NextResponse.json({ response });

    } catch (error) {
        console.error("Chat endpoint error:", error);
        return NextResponse.json({ error: "Failed to process chat" }, { status: 500 });
    }
}
