import { logActivity } from "@/lib/activity-logger";
import { requireAuth } from "@/lib/auth";
import { extractTokens } from "@/lib/unified-search/feedback";
import { NextRequest, NextResponse } from "next/server";

interface FeedbackPayload {
    verdict?: "relevant" | "irrelevant";
    text?: string;
    tokens?: string[];
    sourceId?: string;
}

export async function POST(request: NextRequest) {
    const { session, response } = await requireAuth();
    if (response) return response;

    try {
        const payload = (await request.json()) as FeedbackPayload;
        const verdict = payload.verdict;

        if (verdict !== "relevant" && verdict !== "irrelevant") {
            return NextResponse.json({ error: "verdict must be 'relevant' or 'irrelevant'" }, { status: 400 });
        }

        const providedTokens = Array.isArray(payload.tokens)
            ? payload.tokens.map((token) => token.trim()).filter(Boolean)
            : [];

        const derivedTokens = payload.text ? extractTokens(payload.text) : [];
        const tokens = [...new Set([...providedTokens, ...derivedTokens])].slice(0, 20);

        await logActivity({
            userId: (session!.user as any).id,
            action: "unified_feedback",
            details: JSON.stringify({
                verdict,
                tokens,
                sourceId: payload.sourceId || null,
            }),
        });

        return NextResponse.json({
            ok: true,
            storedTokens: tokens.length,
        });
    } catch (error) {
        console.error("Unified feedback error:", error);
        return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
    }
}
