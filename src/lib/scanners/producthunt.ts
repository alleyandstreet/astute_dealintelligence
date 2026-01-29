import { db } from "@/lib/db";

// Helper type for RSS items
interface RSSItem {
    title?: string;
    link?: string;
    content?: string;
    contentSnippet?: string;
    pubDate?: string;
    creator?: string;
    categories?: string[];
}

// Function to scan ProductHunt topics
export async function scanProductHunt(
    topics: string[],
    keywords: string[],
    send: (data: any) => void
) {
    send({ type: "status", message: "🚀 Starting ProductHunt scan..." });
    send({ type: "log", message: `Scanning ${topics.length} topics` });
    send({ type: "log", message: `Keywords: ${keywords.length > 0 ? keywords.join(", ") : "None (All)"}` });

    let postsScanned = 0;
    let matchesFound = 0;
    let dealsCreated = 0;

    try {
        const Parser = (await import("rss-parser")).default;
        const parser = new Parser({
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            },
        });

        for (const topic of topics) {
            const cleanTopic = topic.trim().toLowerCase().replace(/\s+/g, '-');
            // ProductHunt RSS feed URL structure: https://www.producthunt.com/feed?category=topic-name or similar.
            // Actually main feed is https://www.producthunt.com/feed
            // Topic feed: https://www.producthunt.com/topics/saas/feed.rss
            let feedUrl = cleanTopic === 'all' || cleanTopic === 'home'
                ? `https://www.producthunt.com/feed`
                : `https://www.producthunt.com/topics/${cleanTopic}/feed.rss`;

            send({ type: "log", message: `📡 Fetching ${topic} (RSS)...` });

            let items: any[] = [];

            try {
                // Try specific topic feed first
                const feed = await parser.parseURL(feedUrl);
                items = feed.items || [];
                send({ type: "log", message: `✅ Got ${items.length} products from ${topic}` });
            } catch (err) {
                send({ type: "log", message: `⚠️ Error fetching ${topic} feed: ${err}` });

                // Fallback to main feed if topic fails (often due to 403 blocks on specific topics)
                if (cleanTopic !== 'home' && cleanTopic !== 'all') {
                    send({ type: "log", message: `🔄 Falling back to main ProductHunt feed...` });
                    try {
                        const mainFeed = await parser.parseURL('https://www.producthunt.com/feed');
                        items = mainFeed.items || [];
                        send({ type: "log", message: `✅ Retrieved ${items.length} products from Main Feed (Fallback)` });
                    } catch (fallbackErr) {
                        send({ type: "log", message: `❌ Main feed fallback also failed: ${fallbackErr}` });
                    }
                }
            }

            if (items.length === 0) {
                send({ type: "log", message: `ℹ️ No items found for ${topic}. Skipping.` });
                continue;
            }

            postsScanned += items.length;
            send({ type: "status", message: `📊 Analyzing ${items.length} products...` });

            for (const item of items) {
                try {
                    const title = item.title || "Untitled";
                    const content = item.contentSnippet || item.content || "";
                    const link = item.link || "";

                    // Log what data we have from RSS
                    console.log(`\n=== ProductHunt RSS Data ===`);
                    console.log(`Title: ${title}`);
                    console.log(`Content length: ${content.length} chars`);
                    console.log(`Content preview: ${content.slice(0, 200)}...`);
                    console.log(`Link: ${link}`);
                    console.log(`Creator: ${item.creator || "none"}`);
                    console.log(`===========================\n`);

                    // ProductHunt: Analyze all products (no keyword filtering)
                    matchesFound++;

                    // Check if already exists
                    const existing = await db.deal.findFirst({
                        where: {
                            redditUrl: link, // Reusing this field for external URL
                        }
                    });

                    if (existing) continue;

                    send({ type: "log", message: `🤖 AI analyzing: "${title.slice(0, 40)}..."` });

                    // Analyze with ProductHunt-specific scoring
                    const { analyzeProductHuntListing } = await import("@/lib/gemini");
                    let analysis = await analyzeProductHuntListing(
                        title,
                        content,
                        topic,
                        item.creator || "maker"
                    );

                    // FALLBACK: If AI analysis fails, create deal with default scores
                    // This ensures we don't lose ProductHunt data due to AI issues
                    if (!analysis) {
                        send({ type: "log", message: `⚠️ AI failed, using fallback for: "${title.slice(0, 40)}..."` });
                        analysis = {
                            business_name: title,
                            industry: "Unknown",
                            estimated_revenue: "Not mentioned",
                            revenue_type: "Unknown",
                            valuation_range: { min: 0, max: 0 },
                            viability_score: 50, // Default middle score
                            motivation_score: 50,
                            deal_quality: 50,
                            risk_flags: ["AI analysis unavailable"],
                            seller_signals: ["ProductHunt listing"],
                            contact_info: { reddit: "", website: "", email: "" },
                            ai_summary: `ProductHunt product: ${title}. Manual review recommended.`,
                            business_type: "ProductHunt Listing"
                        };
                    }

                    // Save to DB (either AI-analyzed or fallback)
                    const deal = await db.deal.create({
                        data: {
                            name: analysis.business_name !== "Unknown Business" ? analysis.business_name : title,
                            description: content,
                            source: "ProductHunt",
                            industry: analysis.industry,
                            revenue: analysis.estimated_revenue !== "Not mentioned" ? parseFloat(analysis.estimated_revenue.replace(/[^0-9.]/g, '')) || 0 : 0,
                            revenueType: analysis.revenue_type,
                            valuationMin: analysis.valuation_range?.min || 0,
                            valuationMax: analysis.valuation_range?.max || 0,
                            viabilityScore: analysis.viability_score,
                            motivationScore: analysis.motivation_score,
                            dealQuality: analysis.deal_quality,
                            riskFlags: JSON.stringify(analysis.risk_flags),
                            sellerSignals: JSON.stringify(analysis.seller_signals),
                            redditUrl: link, // Storing PH link here
                            redditAuthor: item.creator || "maker", // Storing Maker name
                            aiSummary: analysis.ai_summary,
                            status: "new_leads",
                        }
                    });

                    dealsCreated++;
                    send({ type: "log", message: `✨ NEW DEAL: "${title.slice(0, 30)}..." | Quality: ${analysis.deal_quality}/100` });
                } catch (itemErr) {
                    console.error("❌ Error processing item:", itemErr);
                    const errorMsg = itemErr instanceof Error ? itemErr.message : String(itemErr);
                    const itemTitle = (item.title || "Unknown").slice(0, 30);
                    send({ type: "log", message: `❌ ERROR: "${itemTitle}..." - ${errorMsg}` });
                }
            }
        }

        send({ type: "status", message: "✅ Scan complete!" });
        send({ type: "complete", summary: { postsScanned, matchesFound, dealsCreated } });

    } catch (error) {
        console.error("Scanner error:", error);
        send({ type: "error", message: `Critical error: ${error}` });
    }
}
