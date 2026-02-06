
import { db } from "@/lib/db";
import { analyzeIndieHackersPost } from "@/lib/gemini";
import { enrichDeal } from "@/lib/contact-scraper";

const ALGOLIA_APP_ID = "N86T1R3OWZ";
const ALGOLIA_API_KEY = "5140dac5e87f47346abbda1a34ee70c3";
const ALGOLIA_INDEX = "products";

export async function scanIndieHackers(
    subreddits: string[], // Unused
    keywords: string[],
    send: (data: any) => void
) {
    send({ type: "status", message: "🚀 Starting IndieHackers Products scan..." });

    try {
        // 1. Query Algolia 'products' index
        // We want recently updated or created products
        send({ type: "status", message: "📡 Fetching latest products..." });

        // Sorting by 'createdTimestamp' descending (numeric filter not strictly needed if we just want latest hits, 
        // but 'newest' index usually implies pre-sorted. checking if 'products' is sorted effectively by default or needs params)
        // 'products' index seems natural order or relevant. Let's try to filter by recent date if possible, 
        // or just grab the latest 20 hits which likely returns top relevant or new.
        // Actually, the previous `products` query returned recent items (timestamps 177...).
        // We will just fetch the hits.

        // Fetching more results to increase range
        const response = await fetch(`https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`, {
            method: "POST",
            headers: {
                "X-Algolia-Application-Id": ALGOLIA_APP_ID,
                "X-Algolia-API-Key": ALGOLIA_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                params: `query=&hitsPerPage=100`
            })
        });

        if (!response.ok) {
            throw new Error(`Algolia error: ${response.statusText}`);
        }

        const data = await response.json();
        const hits = data.hits || [];

        send({ type: "status", message: `📊 Found ${hits.length} products. Analyzing...` });

        let dealsFound = 0;
        let matchCount = 0;

        // Broadened keywords - effectively optional now as we want most products
        // We will just skip obvious junk if needed, but for now we accept all valid products
        send({ type: "log", message: `Scanning all ${hits.length} products (Broadened scope)` });

        let rateLimitHit = false;

        for (const hit of hits) {
            if (!hit.name) continue;

            const productId = hit.productId || hit.objectID;
            const sourceId = `ih_prod_${productId}`;

            try {
                // Check dupes
                const existingDeal = await db.deal.findUnique({
                    where: { sourceId: sourceId }
                });

                if (existingDeal) {
                    continue;
                }

                // Construct rich content for analysis
                // hit.revenue is a number (e.g., 0 or 1000)
                // hit.tagline is useful
                const revenueText = hit.revenue ? `\nSelf-Reported Revenue: $${hit.revenue}/mo` : "";
                const content = (hit.tagline || "") + "\n\n" + (hit.description || "") + revenueText;

                // SKIPPED: Keyword pre-filtering. 
                // We want to capture essentially ALL products in the database as "Deals" or "Leads"
                // unless they are clearly empty/spam. All IH products are valid startup leads.

                matchCount++;
                send({ type: "log", message: `🤖 Analyzing: "${hit.name}"...` });
                console.log(`[IH-DEBUG] Analyzing ${hit.name}`);

                // Adaptive Delay: If rate limit hit, we can go faster (no AI)
                const delayMs = rateLimitHit ? 100 : 2000;
                await new Promise(r => setTimeout(r, delayMs));

                let analysis = null;

                // Only try AI if we haven't hit rate limits yet
                if (!rateLimitHit) {
                    try {
                        console.log(`[IH-DEBUG] Calling analyzeIndieHackersPost...`);
                        analysis = await analyzeIndieHackersPost(hit.name, content, hit.twitterHandle || "Founder");
                        console.log(`[IH-DEBUG] Analysis result:`, analysis ? "Success" : "Null");
                    } catch (aiError) {
                        console.error(`[IH-DEBUG] AI Error:`, aiError);
                        send({ type: "log", message: `⚠️ AI Analysis failed for ${hit.name}: ${aiError}` });

                        // Detect rate limit error (usually 429)
                        // Gemini client might wrap it, but let's assume any error after retries suggests we should back off
                        rateLimitHit = true;
                        console.log(`[IH-DEBUG] Switching to FAST FALLBACK MODE due to API errors.`);
                    }
                }

                // Fallback / Fast Mode Logic
                if (!analysis) {
                    // AI failed (could be rate limit or parsing error).
                    // In any case, if AI is struggling, let's switch to Fast Mode to process the rest significantly faster.
                    if (!rateLimitHit) {
                        rateLimitHit = true;
                        console.log(`[IH-DEBUG] AI returned null. Switching to FAST FALLBACK MODE for remaining items.`);
                    }

                    if (rateLimitHit) console.log(`[IH-DEBUG] Fast Fallback (Rate Limit Mode)`);

                    analysis = {
                        viability_score: hit.revenue > 0 ? 75 : 50, // Default score for products
                        motivation_score: 50,
                        deal_quality: 50,
                        industry: "SaaS", // Default
                        business_name: hit.name,
                        ai_summary: hit.tagline || hit.description?.slice(0, 200) || "New product launch.",
                        risk_flags: [],
                        seller_signals: [],
                        contact_info: { website: hit.websiteUrl },
                        business_type: "SaaS",
                        estimated_revenue: hit.revenue ? `$${hit.revenue}` : "$0",
                        revenue_type: "Monthly",
                        valuation_range: { min: 0, max: 0 }
                    };
                }

                // Generous scoring to ensure we capture them
                let viabilityScore = analysis?.viability_score || 0;
                if (hit.revenue && hit.revenue > 0) viabilityScore += 20; // Boost verified revenue
                // If it's a valid product on IH, we generally want it.
                if (viabilityScore < 40) viabilityScore = 40;
                if (viabilityScore > 95) viabilityScore = 95;

                const deal = await db.deal.create({
                    data: {
                        name: hit.name,
                        description: (content.slice(0, 1000) + "\n\n" + (analysis?.ai_summary || "")).slice(0, 2000),
                        industry: analysis?.industry || "SaaS",
                        source: "indiehackers",
                        sourceId: sourceId,
                        sourceName: "Indie Hackers",
                        redditUrl: hit.websiteUrl || `https://www.indiehackers.com/product/${productId}`,
                        redditAuthor: hit.twitterHandle || "Unknown",
                        url: hit.websiteUrl,
                        revenue: hit.revenue || 0,
                        revenueType: "Monthly",
                        viabilityScore: viabilityScore,
                        motivationScore: analysis?.motivation_score || 50,
                        dealQuality: analysis?.deal_quality || 50,
                        riskFlags: JSON.stringify(analysis?.risk_flags || []),
                        sellerSignals: JSON.stringify(analysis?.seller_signals || []),
                        aiSummary: analysis?.ai_summary || hit.tagline,
                        contactWebsite: hit.websiteUrl,
                        contactTwitter: hit.twitterHandle ? `https://twitter.com/${hit.twitterHandle}` : null,
                        status: "new_leads",
                        createdAt: hit.createdTimestamp ? new Date(hit.createdTimestamp) : new Date()
                    }
                });

                const emoji = deal.viabilityScore && deal.viabilityScore >= 70 ? "🔥" : "✨";
                const revDisplay = deal.revenue ? `($${deal.revenue}/mo)` : "";
                send({ type: "log", message: `${emoji} NEW DEAL: "${deal.name}" ${revDisplay}` });
                dealsFound++;

                // Trigger Enrichment
                if (hit.websiteUrl) {
                    enrichDeal(deal.id, hit.websiteUrl).catch(console.error);
                }

            } catch (err) {
                console.error("Error on IH item:", err);
            }
        }

        send({ type: "status", message: "✅ Scan complete!" });
        send({
            type: "complete",
            summary: {
                postsScanned: hits.length,
                matchesFound: matchCount,
                dealsCreated: dealsFound
            }
        });

    } catch (error) {
        console.error("❌ Error scanning IndieHackers:", error);
        send({ type: "error", message: `Scan failed: ${error}` });
    }
}
