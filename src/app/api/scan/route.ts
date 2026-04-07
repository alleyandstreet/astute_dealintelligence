import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { runUnifiedSearch } from "@/lib/unified-search/orchestrator";
import type { UnifiedPlatformId } from "@/lib/unified-search/types";

const PLATFORM_MAP: Record<string, UnifiedPlatformId> = {
    reddit: "reddit",
    producthunt: "producthunt",
    indiehustle: "indiehustle",
    indiehackers: "indiehackers",
};

function toNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function toList(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.map((entry) => String(entry || "").trim()).filter(Boolean);
}

export async function POST(request: NextRequest) {
    const { session, response } = await requireAuth({
        feature: "deal_sourcing",
        rateLimitKey: "deal_sourcing_requests",
    });
    if (response) return response;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: object) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            try {
                const body = await request.json();
                const subreddits = toList(body.subreddits);
                const keywords = toList(body.keywords);
                const platform: string = body.platform || "reddit";
                const minRevenue = toNumber(body.minRevenue);
                const platformId = PLATFORM_MAP[platform];

                if (session?.user) {
                    await logActivity({
                        userId: (session.user as any).id,
                        action: "scan_started",
                        details: `Started ${platform} scan. Keywords: ${keywords.join(", ")}`,
                    });
                }

                const summary = await runUnifiedSearch({
                    input: {
                        platforms: platformId ? [platformId] : undefined,
                        seeds: subreddits,
                        keywords,
                        minARR: minRevenue,
                        strictRevenue: Boolean(body.strictRevenue),
                        maxItemsPerPlatform: toNumber(body.maxItemsPerPlatform) ?? 60,
                        bypassCache: Boolean(body.bypassCache),
                    },
                    send,
                    userId: (session?.user as any)?.id,
                });

                send({
                    type: "complete",
                    summary: {
                        postsScanned: summary.scanned,
                        matchesFound: summary.relevant,
                        dealsCreated: summary.persisted,
                        duplicatesRemoved: summary.duplicatesRemoved,
                        filteredByARR: summary.filteredByARR,
                        failedSeeds: summary.deadLetters.length,
                    },
                });

            } catch (error) {
                console.error("Scan error:", error);
                send({ type: "error", message: "Scan failed. Please try again later." });
            } finally {
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

