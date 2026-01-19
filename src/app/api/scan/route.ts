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
                                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                                    "Accept": "application/json",
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

                        // Score the post with error handling
                        let scores;
                        try {
                            scores = scorePost(post.title || "", post.content || "", post.subreddit || "");
                        } catch (scoreError) {
                            send({ type: "log", message: `❌ Scoring error for "${post.title}": ${scoreError}` });
                            console.error("Scoring error details:", scoreError, { title: post.title, content: post.content?.substring(0, 100) });
                            continue;
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
                                    revenueType: scores.estimatedRevenue.includes("MRR") ? "MRR" :
                                        scores.estimatedRevenue.includes("ARR") ? "ARR" : null,
                                    valuationMin: scores.valuationMin || null,
                                    valuationMax: scores.valuationMax || null,
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
