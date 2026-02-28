import { requireAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { runUnifiedSearch } from "@/lib/unified-search/orchestrator";
import type { UnifiedPlatformId, UnifiedSearchInput } from "@/lib/unified-search/types";
import { NextRequest } from "next/server";

const VALID_PLATFORMS: UnifiedPlatformId[] = ["reddit", "producthunt", "indiehustle", "indiehackers"];

function parseNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === "") return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return undefined;
    return parsed;
}

function parsePlatforms(rawPlatforms: unknown, legacyPlatform: unknown): UnifiedPlatformId[] | undefined {
    if (Array.isArray(rawPlatforms)) {
        const platforms = rawPlatforms.filter((platform): platform is UnifiedPlatformId =>
            VALID_PLATFORMS.includes(platform as UnifiedPlatformId),
        );
        return platforms.length ? platforms : undefined;
    }

    if (typeof legacyPlatform === "string" && VALID_PLATFORMS.includes(legacyPlatform as UnifiedPlatformId)) {
        return [legacyPlatform as UnifiedPlatformId];
    }

    return undefined;
}

function parseBodyToInput(body: Record<string, unknown>): UnifiedSearchInput {
    const seedsFromBody = Array.isArray(body.seeds)
        ? body.seeds
        : Array.isArray(body.subreddits)
            ? body.subreddits
            : [];

    const keywordsFromBody = Array.isArray(body.keywords) ? body.keywords : [];

    const seeds = seedsFromBody
        .map((seed) => String(seed || "").trim())
        .filter(Boolean);

    const keywords = keywordsFromBody
        .map((keyword) => String(keyword || "").trim())
        .filter(Boolean);

    return {
        query: typeof body.query === "string" ? body.query : undefined,
        keywords,
        seeds,
        platforms: parsePlatforms(body.platforms, body.platform),
        minARR: parseNumber(body.minARR ?? body.minRevenue),
        maxARR: parseNumber(body.maxARR),
        minConfidence: parseNumber(body.minConfidence),
        maxItemsPerPlatform: parseNumber(body.maxItemsPerPlatform),
        strictRevenue: Boolean(body.strictRevenue),
        bypassCache: Boolean(body.bypassCache),
    };
}

export async function POST(request: NextRequest) {
    const { session, response } = await requireAuth();
    if (response) return response;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: object) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            try {
                const body = (await request.json()) as Record<string, unknown>;
                const input = parseBodyToInput(body);

                if (session?.user) {
                    await logActivity({
                        userId: (session.user as any).id,
                        action: "unified_scan_started",
                        details: JSON.stringify({
                            platforms: input.platforms,
                            seeds: input.seeds.length,
                            keywords: input.keywords.length,
                            maxARR: input.maxARR ?? null,
                        }),
                    });
                }

                send({ type: "status", message: "🚀 Unified scan initialized" });

                const summary = await runUnifiedSearch({
                    input,
                    send,
                    userId: (session?.user as any)?.id,
                });

                send({ type: "complete", summary });

                if (session?.user) {
                    await logActivity({
                        userId: (session.user as any).id,
                        action: "unified_scan_completed",
                        details: JSON.stringify(summary),
                    });
                }
            } catch (error) {
                console.error("Unified scan error:", error);
                send({ type: "error", message: "Unified scan failed. Please retry." });
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
