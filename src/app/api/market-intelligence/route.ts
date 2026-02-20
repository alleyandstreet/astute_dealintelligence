import { NextRequest, NextResponse } from "next/server";
import { analyzeMarketTrends } from "@/lib/gemini";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { content } = body;

        if (!content) {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        const analysis = await analyzeMarketTrends(content);

        if (!analysis) {
            return NextResponse.json({ error: "Failed to analyze market trends" }, { status: 500 });
        }

        return NextResponse.json(analysis);
    } catch (error) {
        console.error("Error in market intelligence API:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
