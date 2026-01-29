import { db } from "@/lib/db";

// Function to scan IndieHustle (Substack publication)
export async function scanIndieHustle(
    topics: string[],
    keywords: string[],
    minRevenue: number = 0,
    send: (data: any) => void
) {
    send({ type: "status", message: "🚀 Starting IndieHustle scan..." });
    if (minRevenue > 0) send({ type: "log", message: `Filters: Min Revenue $${minRevenue}` });

    // Helper to parse revenue strings like "$30k", "$1.2M", "$500"
    const parseRevenue = (rev: string): number => {
        if (!rev || rev === "Not mentioned" || rev === "Unknown") return 0;
        const clean = rev.toLowerCase().replace(/,/g, '').trim();
        let multiplier = 1;
        if (clean.includes('k')) multiplier = 1000;
        if (clean.includes('m') || clean.includes('million')) multiplier = 1000000;
        if (clean.includes('b') || clean.includes('billion')) multiplier = 1000000000;

        // Remove non-numeric chars except dot
        const num = parseFloat(clean.replace(/[^0-9.]/g, ''));
        return (num || 0) * multiplier;
    };

    let postsScanned = 0;
    let matchesFound = 0;
    let dealsCreated = 0;

    try {
        // IndieHustle JSON API (Substack)
        const baseUrl = "https://www.indiehustle.co/api/v1/archive";

        send({ type: "log", message: `📡 Fetching IndieHustle via JSON API (100 posts)...` });

        let items: any[] = [];
        const seenLinks = new Set<string>();

        // Fetch 2 pages of 50 items each
        for (let offset = 0; offset < 100; offset += 50) {
            try {
                const apiUrl = `${baseUrl}?sort=new&search=&offset=${offset}&limit=50`;
                send({ type: "log", message: `📥 Fetching posts ${offset + 1} to ${offset + 50}...` });

                const response = await fetch(apiUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (data && Array.isArray(data) && data.length > 0) {
                    for (const post of data) {
                        const link = post.canonical_url || `https://www.indiehustle.co/p/${post.slug}`;
                        if (!seenLinks.has(link)) {
                            seenLinks.add(link);
                            // Transform JSON post to match expected structure
                            items.push({
                                title: post.title,
                                link: link,
                                content: post.description || post.subtitle || "",
                                contentSnippet: post.subtitle || post.description || "",
                                creator: post.author_name || "author"
                            });
                        }
                    }
                } else {
                    break;
                }
            } catch (err) {
                send({ type: "log", message: `⚠️ Warning: Error fetching IndieHustle API at offset ${offset}: ${err}` });
                continue;
            }
        }

        if (items.length === 0) {
            send({ type: "log", message: `ℹ️ No items found. Skipping.` });
            send({ type: "complete", summary: { postsScanned: 0, matchesFound: 0, dealsCreated: 0 } });
            return;
        }

        postsScanned = items.length;
        send({ type: "status", message: `📊 Analyzing ${items.length} IndieHustle posts...` });
        send({ type: "log", message: `✅ Collected ${items.length} unique articles from IndieHustle API` });

        for (const item of items) {
            try {
                const title = item.title || "Untitled";
                const content = item.contentSnippet || item.content || "";
                const link = item.link || "";

                // Log what data we have
                console.log(`\n=== IndieHustle Data ===`);
                console.log(`Title: ${title}`);
                console.log(`Link: ${link}`);
                console.log(`===========================\n`);

                // Filter by keywords if provided (LOGGING ONLY - DO NOT SKIP)
                if (keywords.length > 0) {
                    const searchText = `${title} ${content}`.toLowerCase();
                    const hasKeyword = keywords.some(kw => searchText.includes(kw.toLowerCase()));

                    if (!hasKeyword) {
                        console.log(`Note: "${title.slice(0, 20)}..." - No keyword match (Proceeding to AI anyway)`);
                        // continue; // DISABLED: We want to analyze everything
                    }
                }

                matchesFound++;

                // Check if already exists
                const existing = await db.deal.findFirst({
                    where: {
                        redditUrl: link, // Reusing this field for external URL
                    }
                });

                if (existing) {
                    send({ type: "log", message: `⏭️ Skipping duplicate: ${title.slice(0, 40)}...` });
                    continue;
                }

                send({ type: "log", message: `🤖 AI analyzing: "${title.slice(0, 40)}..."` });

                let contactTwitter: string | null = null;
                let contactLinkedIn: string | null = null;
                let contactDiscord: string | null = null;
                let contactWebsite: string | null = null;

                // Deep Fetch: Get the full page content to find social links
                try {
                    send({ type: "log", message: `🔍 Deep scanning: ${link}` });
                    const pageRes = await fetch(link, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
                        }
                    });

                    if (pageRes.ok) {
                        const html = await pageRes.text();

                        // Extract Twitter/X
                        const twitterMatch = html.match(/https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]+/i);
                        if (twitterMatch) contactTwitter = twitterMatch[0];

                        // Extract LinkedIn
                        const linkedInMatch = html.match(/https?:\/\/(?:www\.)?linkedin\.com\/(?:in|company)\/[a-zA-Z0-9_-]+/i);
                        if (linkedInMatch) contactLinkedIn = linkedInMatch[0];

                        // Extract Discord
                        const discordMatch = html.match(/https?:\/\/(?:www\.)?(?:discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9]+/i);
                        if (discordMatch) contactDiscord = discordMatch[0];

                        // Extract Website (simple heuristic: look for "Website:" or similar, strict regex is hard)
                        // For now rely on AI or explicit fields if available. 
                        // But we can try to find the first external link in the "links" section if achievable.
                    }
                } catch (err) {
                    console.error("Deep fetch failed:", err);
                }

                // Analyze with IndieHustle-specific scoring
                const { analyzeIndieHustleListing } = await import("@/lib/gemini");
                let analysis = await analyzeIndieHustleListing(
                    title,
                    content,
                    item.creator || "author"
                );

                // FALLBACK: If AI analysis fails, create deal with default scores
                if (!analysis) {
                    send({ type: "log", message: `⚠️ AI failed, using fallback for: "${title.slice(0, 40)}..."` });
                    analysis = {
                        business_name: title,
                        industry: "Unknown",
                        estimated_revenue: "Not mentioned",
                        revenue_type: "Unknown",
                        valuation_range: { min: 0, max: 0 },
                        viability_score: 50,
                        motivation_score: 50,
                        deal_quality: 50,
                        risk_flags: ["AI analysis unavailable"],
                        seller_signals: ["IndieHustle post"],
                        contact_info: { reddit: "", website: "", email: "" },
                        ai_summary: `IndieHustle post: ${title}. Manual review recommended.`,
                        business_type: "IndieHustle Listing"
                    };
                }

                // Check Revenue Filter
                const parsedRevenue = parseRevenue(analysis.estimated_revenue);
                // Only filter if revenue > 0 to avoid filtering "unknown" if user didn't strict mode (user just asked for filter)
                // But user asked for "filter for monetary value like MRR or Revenue".
                // If minRevenue is set, we should probably respect it strictly?
                // Let's assume strict filtering if minRevenue > 0.
                if (minRevenue > 0 && parsedRevenue < minRevenue) {
                    send({ type: "log", message: `Skipping "${title.slice(0, 20)}..." - Revenue $${parsedRevenue} < $${minRevenue}` });
                    continue;
                }

                // Save to DB with correct source
                const deal = await db.deal.create({
                    data: {
                        name: analysis.business_name !== "Unknown Business" ? analysis.business_name : title,
                        description: content.slice(0, 2000),
                        source: "indiehustle",
                        industry: analysis.industry,
                        revenue: parsedRevenue,
                        revenueType: analysis.revenue_type,
                        valuationMin: analysis.valuation_range?.min || 0,
                        valuationMax: analysis.valuation_range?.max || 0,
                        viabilityScore: analysis.viability_score,
                        motivationScore: analysis.motivation_score,
                        dealQuality: analysis.deal_quality,
                        riskFlags: JSON.stringify(analysis.risk_flags),
                        sellerSignals: JSON.stringify(analysis.seller_signals),
                        redditUrl: link, // Storing IndieHustle link here
                        redditAuthor: item.creator || "author",
                        aiSummary: analysis.ai_summary,
                        contactTwitter: contactTwitter,
                        contactLinkedIn: contactLinkedIn,
                        contactDiscord: contactDiscord,
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

        send({ type: "status", message: "✅ Scan complete!" });
        send({ type: "complete", summary: { postsScanned, matchesFound, dealsCreated } });

    } catch (error) {
        console.error("Scanner error:", error);
        send({ type: "error", message: `Critical error: ${error}` });
    }
}
