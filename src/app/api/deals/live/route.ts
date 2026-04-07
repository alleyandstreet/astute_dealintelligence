import { requireAuth } from "@/lib/auth";
import { getCurrentDealsVersion, subscribeToDealEvents } from "@/lib/deal-collaboration";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const { response } = await requireAuth({
        feature: "deal_sourcing",
    });
    if (response) return response;

    const encoder = new TextEncoder();
    let unsubscribe: (() => void) | null = null;
    let keepAlive: NodeJS.Timeout | null = null;
    let abortHandler: (() => void) | null = null;

    const stream = new ReadableStream({
        start(controller) {
            const send = (payload: unknown) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            };

            send({
                type: "connected",
                version: getCurrentDealsVersion(),
                at: new Date().toISOString(),
            });

            unsubscribe = subscribeToDealEvents((event) => {
                send(event);
            });

            keepAlive = setInterval(() => {
                controller.enqueue(encoder.encode(`: keepalive ${Date.now()}\n\n`));
            }, 20_000);

            abortHandler = () => {
                if (keepAlive) {
                    clearInterval(keepAlive);
                    keepAlive = null;
                }
                if (unsubscribe) {
                    unsubscribe();
                    unsubscribe = null;
                }
                try {
                    controller.close();
                } catch {
                    // Stream may already be closed.
                }
            };

            if (request.signal.aborted) {
                abortHandler();
                return;
            }

            request.signal.addEventListener("abort", abortHandler, { once: true });
        },
        cancel() {
            if (abortHandler) {
                abortHandler();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
