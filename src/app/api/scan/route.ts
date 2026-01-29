import { scanReddit } from "@/lib/scanners/reddit";
import { scanProductHunt } from "@/lib/scanners/producthunt";
import { scanIndieHustle } from "@/lib/scanners/indiehustle";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: object) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            try {
                const body = await request.json();
                const subreddits: string[] = body.subreddits || [];
                const keywords: string[] = body.keywords || [];

                const platform: string = body.platform || "reddit";
                const minRevenue: number = body.minRevenue ? parseInt(body.minRevenue) : 0;

                if (platform === "producthunt") {
                    await scanProductHunt(subreddits, keywords, send);
                } else if (platform === "indiehustle") {
                    await scanIndieHustle(subreddits, keywords, minRevenue, send);
                } else {
                    await scanReddit(subreddits, keywords, send);
                }

            } catch (error) {
                send({ type: "error", message: `Scan failed: ${error}` });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}

