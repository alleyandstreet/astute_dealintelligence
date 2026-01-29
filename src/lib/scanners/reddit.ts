import { db } from "@/lib/db";
import { RedditPost } from "@/lib/reddit";
import { scorePost, isRelevantPost } from "@/lib/scoring";

export async function scanReddit(
    subreddits: string[],
    keywords: string[],
    send: (data: any) => void
) {
    if (subreddits.length === 0) {
        send({ type: "error", message: "No subreddits provided" });
        return;
    }

    send({ type: "status", message: "🚀 Starting Reddit scan..." });
    send({ type: "log", message: `Scanning ${subreddits.length} subreddits` });
    send({ type: "log", message: `Keywords: ${keywords.join(", ")}` });

    // Scrape Reddit using RSS (more permissive)
    const Parser = (await import("rss-parser")).default;
    const parser = new Parser({
        headers: {
            "User-Agent": "Astute/1.0.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        },
    });

    const allPosts: RedditPost[] = [];
    for (const subreddit of subreddits) {
        send({ type: "log", message: `📡 Fetching r/${subreddit} (RSS)...` });

        try {
            const feed = await parser.parseURL(`https://www.reddit.com/r/${subreddit}/new.rss?limit=100`);

            feed.items.forEach(item => {
                // Clean up the content (Reddit RSS puts HTML in summary)
                const rawContent = item.contentSnippet || item.content || "";
                // Basic HTML tag stripping
                const cleanContent = rawContent
                    .replace(/<[^>]*>?/gm, " ")
                    .replace(/&nbsp;/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();

                allPosts.push({
                    id: item.id || item.link || Math.random().toString(),
                    title: item.title || "",
                    content: cleanContent,
                    author: item.creator || item.author || "anonymous",
                    subreddit: subreddit,
                    url: item.link || "",
                    score: 0, // RSS doesn't give score easily
                    numComments: 0, // RSS doesn't give comments easily
                    createdAt: item.isoDate ? new Date(item.isoDate) : new Date(),
                    permalink: item.link?.replace("https://www.reddit.com", "") || "",
                });
            });

            send({ type: "log", message: `✅ Got ${feed.items.length} posts from r/${subreddit}` });

            // Rate limiting to be polite
            await new Promise(r => setTimeout(r, 2000));
        } catch (error) {
            send({ type: "log", message: `⚠️ Failed to fetch r/${subreddit}: ${error}` });
            console.error(`Error fetching r/${subreddit}:`, error);
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
}
