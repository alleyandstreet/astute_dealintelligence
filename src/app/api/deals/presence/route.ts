import { requireAuth } from "@/lib/auth";
import { clearDealPresence, getPresenceByDeal, getPresenceTtlSeconds, upsertDealPresence } from "@/lib/deal-collaboration";
import { NextRequest, NextResponse } from "next/server";

type SessionUser = {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
};

function normalizeDealId(value: unknown): string | null {
    const dealId = String(value || "").trim();
    return dealId.length > 0 ? dealId : null;
}

export async function GET() {
    const { response } = await requireAuth({
        feature: "deal_sourcing",
        rateLimitKey: "deal_sourcing_requests",
    });
    if (response) return response;

    return NextResponse.json({
        presenceByDeal: getPresenceByDeal(),
        ttlSeconds: getPresenceTtlSeconds(),
    });
}

export async function POST(request: NextRequest) {
    const { session, response } = await requireAuth({
        feature: "deal_sourcing",
        rateLimitKey: "deal_sourcing_requests",
    });
    if (response) return response;

    const user = (session?.user || {}) as SessionUser;
    if (!user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const action = String((body as { action?: string }).action || "heartbeat").toLowerCase();
        const dealId = normalizeDealId((body as { dealId?: unknown }).dealId);

        if (action === "clear" || !dealId) {
            clearDealPresence(user.id);
            return NextResponse.json({
                success: true,
                activeDealId: null,
                presenceByDeal: getPresenceByDeal(),
            });
        }

        upsertDealPresence({
            userId: user.id,
            username: user.name || user.email || user.id,
            email: user.email || null,
            role: user.role || null,
            dealId,
        });

        return NextResponse.json({
            success: true,
            activeDealId: dealId,
            presenceByDeal: getPresenceByDeal(),
        });
    } catch (error) {
        console.error("Deal presence update error:", error);
        return NextResponse.json({ error: "Failed to update deal presence" }, { status: 500 });
    }
}
