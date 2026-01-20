import { db } from "@/lib/db";
import { scrapeSubreddits, RedditPost } from "@/lib/reddit";
import { scorePost, isRelevantPost } from "@/lib/scoring";
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

                if (subreddits.length === 0) {
                    send({ type: "error", message: "No subreddits provided" });
                    controller.close();
                    return;
                }

                send({ type: "status", message: "🚀 Starting Reddit scan..." });
                send({ type: "log", message: `Scanning ${subreddits.length} subreddits` });
                send({ type: "log", message: `Keywords: ${keywords.join(", ")}` });

                // Scrape Reddit
                const allPosts: RedditPost[] = [];
                for (const subreddit of subreddits) {
                    send({ type: "log", message: `📡 Fetching r/${subreddit}...` });

                    try {
                        const res = await fetch(
                            `https://www.reddit.com/r/${subreddit}/new.json?limit=50`,
                            {
                                headers: {
                                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                                    "Accept-Language": "en-US,en;q=0.9",
                                    "Cache-Control": "max-age=0",
                                    "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                                    "Sec-Ch-Ua-Mobile": "?0",
                                    "Sec-Ch-Ua-Platform": '"macOS"',
                                    "Sec-Fetch-Dest": "document",
                                    "Sec-Fetch-Mode": "navigate",
                                    "Sec-Fetch-Site": "none",
                                    "Sec-Fetch-User": "?1",
                                    "Upgrade-Insecure-Requests": "1"
                                },
                            }
                        );

                        if (!res.ok) {
                            send({ type: "log", message: `⚠️ Failed to fetch r/${subreddit}: ${res.status}` });
                            continue;
                        }

                        const data = await res.json();
                        const posts = data.data?.children || [];

                        for (const post of posts) {
                            if (!post.data.is_self) continue;
                            allPosts.push({
                                id: post.data.id,
                                title: post.data.title || "",
                                content: post.data.selftext || "",
                                author: post.data.author,
                                subreddit: post.data.subreddit,
                                url: `https://reddit.com${post.data.permalink}`,
                                score: post.data.score,
                                numComments: post.data.num_comments,
                                createdAt: new Date(post.data.created_utc * 1000),
                                permalink: post.data.permalink,
                            });
                        }

                        send({ type: "log", message: `✅ Got ${posts.filter((p: any) => p.data.is_self).length} posts from r/${subreddit}` });

                        // Rate limiting
                        await new Promise(r => setTimeout(r, 1500));
                    } catch (error) {
                        send({ type: "log", message: `❌ Error with r/${subreddit}: ${error}` });
                    }
                }

                send({ type: "status", message: `📊 Analyzing ${allPosts.length} posts...` });

                // Filter and score relevant posts
                let dealsCreated = 0;
                let matchCount = 0;

                // Import Gemini analysis (Dynamic import to avoid issues if needed)
                const { analyzePost } = await import("@/lib/gemini");

                for (const post of allPosts) {
                    try {
                        if (!isRelevantPost(post.title, post.content, keywords)) continue;

                        matchCount++;

                        // Check if already exists
                        const existing = await db.deal.findUnique({
                            where: { sourceId: post.id },
                        });

                        if (existing) {
                            send({ type: "log", message: `⏭️ Skipping duplicate: ${post.title.slice(0, 40)}...` });
                            continue;
                        }

                        send({ type: "log", message: `🤖 AI analyzing: "${post.title.slice(0, 40)}..."` });

                        // Try AI analysis first
                        let scores;
                        let aiResult = null;

                        if (process.env.GEMINI_API_KEY) {
                            try {
                                aiResult = await analyzePost(
                                    post.title,
                                    post.content,
                                    post.subreddit,
                                    post.author
                                );
                            } catch (aiErr) {
                                console.error("Gemini analysis failed, falling back to keywords:", aiErr);
                            }
                        }

                        if (aiResult) {
                            // Map AI result to our DB structure
                            scores = {
                                viabilityScore: aiResult.viability_score,
                                motivationScore: aiResult.motivation_score,
                                dealQuality: aiResult.deal_quality,
                                industry: aiResult.industry,
                                riskFlags: aiResult.risk_flags,
                                sellerSignals: aiResult.seller_signals,
                                aiSummary: aiResult.ai_summary,
                                businessType: aiResult.business_type,
                                revenueValue: aiResult.valuation_range?.min ? Math.round(aiResult.valuation_range.min / 3) : 0, // Heuristic if revenue missing
                                revenueDisplay: aiResult.estimated_revenue,
                                revenueType: aiResult.revenue_type,
                                valuationMin: aiResult.valuation_range?.min || null,
                                valuationMax: aiResult.valuation_range?.max || null,
                            };
                        } else {
                            // Fallback to local keyword algorithm
                            const localScores = scorePost(post.title || "", post.content || "", post.subreddit || "");
                            scores = {
                                ...localScores,
                                revenueDisplay: localScores.estimatedRevenue,
                                revenueType: localScores.estimatedRevenue.includes("MRR") ? "MRR" :
                                    localScores.estimatedRevenue.includes("ARR") ? "ARR" : null,
                            };
                        }

                        // Create deal
                        try {
                            await db.deal.create({
                                data: {
                                    name: post.title.slice(0, 200),
                                    description: post.content.slice(0, 2000),
                                    industry: scores.industry,
                                    source: "reddit",
                                    sourceId: post.id,
                                    sourceName: `r/${post.subreddit}`,
                                    redditUrl: post.url,
                                    redditAuthor: post.author,
                                    redditScore: post.score,
                                    redditComments: post.numComments,
                                    status: "new_leads",
                                    aiSummary: scores.aiSummary,
                                    viabilityScore: scores.viabilityScore,
                                    motivationScore: scores.motivationScore,
                                    dealQuality: scores.dealQuality,
                                    riskFlags: JSON.stringify(scores.riskFlags),
                                    sellerSignals: JSON.stringify(scores.sellerSignals),
                                    businessType: scores.businessType,
                                    revenue: scores.revenueValue || null,
                                    revenueType: scores.revenueType,
                                    valuationMin: scores.valuationMin,
                                    valuationMax: scores.valuationMax,
                                    contactReddit: `u/${post.author}`,
                                },
                            });

                            dealsCreated++;
                            const emoji = scores.viabilityScore >= 70 ? "🔥" : "✨";
                            send({
                                type: "log",
                                message: `${emoji} NEW DEAL: "${post.title.slice(0, 40)}..." | Viability: ${scores.viabilityScore}`
                            });
                        } catch (dbError) {
                            send({ type: "log", message: `❌ Failed to save deal: ${dbError}` });
                            console.error("Database error:", dbError);
                        }
                    } catch (outerError) {
                        send({ type: "log", message: `❌ Unexpected error processing post: ${outerError}` });
                        console.error("Outer error:", outerError, { post });
                    }
                }

                send({ type: "status", message: "✅ Scan complete!" });
                send({
                    type: "complete",
                    summary: {
                        postsScanned: allPosts.length,
                        matchesFound: matchCount,
                        dealsCreated,
                    },
                });
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
