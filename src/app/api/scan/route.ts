import { scanReddit } from "@/lib/scanners/reddit";
import { scanProductHunt } from "@/lib/scanners/producthunt";
import { scanIndieHustle } from "@/lib/scanners/indiehustle";
import { scanIndieHackers } from "@/lib/scanners/indiehackers";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";

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

                const session = await getServerSession(authOptions);
                if (session?.user) {
                    await logActivity({
                        userId: (session.user as any).id,
                        action: "scan_started",
                        details: `Started ${platform} scan. Keywords: ${keywords.join(", ")}`,
                    });
                }

                if (platform === "producthunt") {
                    await scanProductHunt(subreddits, keywords, send);
                } else if (platform === "indiehustle") {
                    await scanIndieHustle(subreddits, keywords, minRevenue, send);
                } else if (platform === "indiehackers") {
                    await scanIndieHackers(subreddits, keywords, send);
                } else {
                    await scanReddit(subreddits, keywords, send);
                }

            } catch (error) {
                send({ type: "error", message: `Scan failed: ${error}` });
            } finally {
                const session = await getServerSession(authOptions);
                if (session?.user) {
                    await logActivity({
                        userId: (session.user as any).id,
                        action: "scan_completed",
                        details: `Completed scan request`,
                    });
                }
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

