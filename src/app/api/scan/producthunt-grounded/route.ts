import { NextRequest, NextResponse } from "next/server";
import { isValid, parseISO } from "date-fns";
import { getGroundedProductHuntDeals } from "@/lib/scanners/producthunt_grounded";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const { session, response } = await requireAuth({
        feature: "deal_sourcing",
        rateLimitKey: "deal_sourcing_requests",
    });
    if (!session) return response;

    const { dates, date, minUpvotes, maxUpvotes } = await req.json();

    const normalizedDates = Array.isArray(dates)
        ? dates.filter((value: any) => typeof value === "string" && value.trim().length > 0)
        : typeof date === "string" && date.trim().length > 0
            ? [date]
            : [];

    const targetDates = Array.from(new Set(normalizedDates))
        .map((value) => value.trim())
        .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
        .filter((value) => isValid(parseISO(value)));

    if (targetDates.length === 0) {
        return NextResponse.json({ error: "Date(s) are required" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: any) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            try {
                const minValue = typeof minUpvotes === "number" ? minUpvotes : Number(minUpvotes) || 0;
                const maxValue = typeof maxUpvotes === "number" ? maxUpvotes : Number(maxUpvotes) || 0;
                const allProducts: any[] = [];
                const perDateSummaries: any[] = [];

                for (const targetDate of targetDates) {
                    send({ type: "status", message: `📅 Processing Product Hunt archive for ${targetDate}...` });
                    const result = await getGroundedProductHuntDeals(
                        targetDate,
                        minValue,
                        maxValue,
                        send,
                        { emitComplete: false }
                    );

                    if (result?.products?.length) {
                        allProducts.push(...result.products);
                    }
                    if (result?.summary) {
                        perDateSummaries.push(result.summary);
                    }
                }

                const totalFound = perDateSummaries.reduce((sum, summary) => sum + (summary.total_found || 0), 0);
                send({ type: "status", message: `✅ Aggregated ${allProducts.length} products across ${targetDates.length} date(s).` });
                send({
                    type: "complete",
                    data: allProducts,
                    summary: {
                        dates: targetDates,
                        total_found: totalFound,
                        matching_count: allProducts.length,
                        minUpvotes: minValue,
                        maxUpvotes: maxValue > 0 ? maxValue : null,
                        per_date: perDateSummaries
                    }
                });
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
