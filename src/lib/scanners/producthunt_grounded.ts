import { scrapeProductHuntWithGrounding } from "@/lib/gemini";
import { fetchProductHuntLeaderboardAll } from "@/lib/producthunt-scraper";

function normalizeUpvotes(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
    if (typeof value === "string") {
        const cleaned = value.replace(/[^0-9.]/g, "");
        const parsed = Number(cleaned);
        if (Number.isFinite(parsed)) return Math.max(0, Math.round(parsed));
    }
    return 0;
}

export async function getGroundedProductHuntDeals(
    date: string,
    minUpvotes: number,
    maxUpvotes: number,
    send: (data: any) => void,
    options?: { emitComplete?: boolean }
) {
    const emitComplete = options?.emitComplete !== false;
    send({ type: "status", message: `🛡️ Starting Grounded Product Hunt scan for ${date}...` });
    send({ id: "init", type: "log", message: "Connecting to Gemini 2.0 with Google Search grounding..." });

    try {
        const scrapedListings = await fetchProductHuntLeaderboardAll(date);
        if (scrapedListings.length > 0) {
            send({ type: "log", message: `📄 Parsed ${scrapedListings.length} listings directly from Product Hunt.` });
        }

        const MIN_EXPECTED = 20;
        let result = scrapedListings.length > 0
            ? { date, total_found: scrapedListings.length, products: scrapedListings }
            : await scrapeProductHuntWithGrounding(date, 0, 0);

        if (scrapedListings.length > 0 && scrapedListings.length < MIN_EXPECTED) {
            send({ type: "log", message: `⚠️ Only ${scrapedListings.length} listings found on page. Expanding with grounded search...` });
            const grounded = await scrapeProductHuntWithGrounding(date, 0, 0, { relaxed: true });
            if (grounded?.products?.length) {
                const merged: typeof scrapedListings = [];
                const seen = new Set<string>();
                const add = (items: typeof scrapedListings) => {
                    for (const item of items) {
                        const key = (item.productHuntUrl || "").trim().toLowerCase() || `${item.name}::${item.tagline}`.toLowerCase();
                        if (key && !seen.has(key)) {
                            seen.add(key);
                            merged.push(item);
                        }
                    }
                };
                add(scrapedListings);
                add(grounded.products);
                result = { date, total_found: merged.length, products: merged };
            }
        }

        if (!result || !result.products) {
            send({ type: "error", message: "Failed to extract products from Product Hunt (direct scrape + grounded)." });
            return;
        }

        if (result.products.length === 0 && scrapedListings.length === 0) {
            send({ type: "log", message: "⚠️ No products returned in strict mode. Retrying with relaxed mode..." });
            const relaxed = await scrapeProductHuntWithGrounding(date, 0, 0, { relaxed: true });
            if (relaxed?.products?.length) {
                result = relaxed;
            }
        }

        const sourceDate = date;
        const normalized = result.products.map((product) => ({
            ...product,
            sourceDate,
            upvotes: normalizeUpvotes(product.upvotes),
        }));

        const withVerified = normalized.map((product) => ({
            ...product,
            upvotesVerified: false,
        }));

        const filtered = withVerified.filter((product) => {
            if (normalizeUpvotes(product.upvotes) < minUpvotes) return false;
            if (maxUpvotes > 0 && normalizeUpvotes(product.upvotes) > maxUpvotes) return false;
            return true;
        });

        send({ type: "status", message: `✅ Found ${filtered.length} products matching criteria.` });

        const summary = {
            total_found: typeof result.total_found === "number" ? result.total_found : filtered.length,
            matching_count: filtered.length,
            date: result.date || date,
            minUpvotes,
            maxUpvotes: maxUpvotes > 0 ? maxUpvotes : null
        };

        if (emitComplete) {
            send({
                type: "complete",
                data: filtered,
                summary
            });
        }

        return { products: filtered, summary };

    } catch (error: any) {
        console.error("Grounded Scanner Error:", error);
        send({ type: "error", message: `Critical error: ${error.message || error}` });
    }
    return null;
}
