import { NextRequest, NextResponse, after } from "next/server";
import { requireAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { runUnifiedSearch } from "@/lib/unified-search/orchestrator";
import { jobManager } from "@/lib/unified-search/job-manager";
import type { UnifiedPlatformId, UnifiedStreamEvent } from "@/lib/unified-search/types";

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
    try {
        const { session, response } = await requireAuth({
            feature: "deal_sourcing",
            rateLimitKey: "deal_sourcing_requests",
        });
        if (response) return response;

        try {
            const body = await request.json();
            const subreddits = toList(body.subreddits);
            const keywords = toList(body.keywords);
            const platform: string = body.platform || "reddit";
            const minRevenue = toNumber(body.minRevenue);
            const platformId = PLATFORM_MAP[platform];
            const repeatCount = Math.min(Math.max(toNumber(body.repeatCount) ?? 1, 1), 10);
            const targetDeals = toNumber(body.targetDeals);

            const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            const userId = (session?.user as any)?.id;

            const baseInput = {
                platforms: platformId ? [platformId] : undefined,
                seeds: subreddits,
                keywords,
                minARR: minRevenue,
                strictRevenue: Boolean(body.strictRevenue),
                maxItemsPerPlatform: toNumber(body.maxItemsPerPlatform) ?? 20,
                bypassCache: Boolean(body.bypassCache),
            };

            jobManager.createJob(jobId, platform, baseInput, userId);

            after(async () => {
                if (userId) {
                    await logActivity({
                        userId,
                        action: "scan_started",
                        details: `Started background ${platform} scan (${repeatCount}x). Job: ${jobId}`,
                    }).catch(() => {});
                }

                const send = (event: UnifiedStreamEvent) => {
                    if (event.type === "log" || event.type === "status" || event.type === "error") {
                        jobManager.addLog(jobId, {
                            message: event.message || "",
                            type: event.type,
                        });
                    } else if (event.type === "metric" && event.key) {
                        const job = jobManager.getJob(jobId);
                        if (job) {
                            job.metrics[event.key] = event.value;
                        }
                    }
                };

                try {
                    let totalPersisted = 0;

                    for (let pass = 0; pass < repeatCount; pass++) {
                        const isFirstPass = pass === 0;

                        if (!isFirstPass) {
                            send({ type: "log", message: `\n⏳ Pass ${pass + 1}/${repeatCount} — waiting 3s before next batch...` });
                            await new Promise(resolve => setTimeout(resolve, 3000));
                        }

                        send({ type: "log", message: `🔄 Pass ${pass + 1}/${repeatCount} starting...` });

                        const passInput = {
                            ...baseInput,
                            // Bypass cache on all subsequent passes to get fresh data
                            bypassCache: isFirstPass ? baseInput.bypassCache : true,
                        };

                        const summary = await runUnifiedSearch({
                            input: passInput,
                            send,
                            userId,
                            jobId,
                        });

                        totalPersisted += summary.persisted;

                        send({ type: "log", message: `✅ Pass ${pass + 1} complete: +${summary.persisted} deals (total: ${totalPersisted})` });

                        // Update the job metrics with running total
                        const job = jobManager.getJob(jobId);
                        if (job) {
                            job.metrics["dealsCreated"] = totalPersisted;
                            job.metrics["passesCompleted"] = pass + 1;
                        }

                        // Early stop if we've hit the target
                        if (targetDeals && totalPersisted >= targetDeals) {
                            send({ type: "status", message: `🎯 Target reached! ${totalPersisted} deals found in ${pass + 1} passes.` });
                            break;
                        }
                    }

                    send({ type: "status", message: `✅ All passes complete. Total deals saved: ${totalPersisted}` });
                    jobManager.updateJob(jobId, { status: "completed" });
                } catch (err) {
                    console.error(`Background Job ${jobId} failed:`, err);
                    jobManager.updateJob(jobId, { status: "failed", error: String(err) });
                } finally {
                    if (userId) {
                        await logActivity({
                            userId,
                            action: "scan_completed",
                            details: `Job ${jobId} finished`,
                        }).catch(() => {});
                    }
                }
            });

            return NextResponse.json({ jobId, platform });
        } catch (innerError: any) {
            console.error("Inner Error parsing body:", innerError);
            return new NextResponse(JSON.stringify({ error: innerError?.message || "Failed inner" }), { status: 500 });
        }
    } catch (outerError: any) {
        console.error("FATAL ERROR in POST /api/scan:", outerError);
        return new NextResponse(`FATAL_ERROR: ${outerError?.message || String(outerError)}\n${outerError?.stack}`, { status: 500 });
    }
}
