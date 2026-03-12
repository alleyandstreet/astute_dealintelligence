import { NextRequest, NextResponse } from "next/server";
import { getGroundedProductHuntDeals } from "@/lib/scanners/producthunt_grounded";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const { session, response } = await requireAuth();
    if (!session) return response;

    const { date, minUpvotes, maxUpvotes } = await req.json();

    if (!date) {
        return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: any) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            try {
                await getGroundedProductHuntDeals(date, minUpvotes || 0, maxUpvotes || 0, send);
            } catch (error: any) {
                send({ type: "error", message: error.message || String(error) });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}
