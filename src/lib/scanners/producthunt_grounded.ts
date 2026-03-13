import { scrapeProductHuntWithGrounding, verifyProductHuntUpvotes } from "@/lib/gemini";

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
    send: (data: any) => void
) {
    send({ type: "status", message: `🛡️ Starting Grounded Product Hunt scan for ${date}...` });
    send({ id: "init", type: "log", message: "Connecting to Gemini 2.0 with Google Search grounding..." });

    try {
        let result = await scrapeProductHuntWithGrounding(date, minUpvotes, maxUpvotes);

        if (!result || !result.products) {
            send({ type: "error", message: "Failed to extract products from Product Hunt using Gemini grounding." });
            return;
        }

        if (result.products.length === 0) {
            send({ type: "log", message: "⚠️ No products returned in strict mode. Retrying with relaxed mode..." });
            const relaxed = await scrapeProductHuntWithGrounding(date, minUpvotes, maxUpvotes, { relaxed: true });
            if (relaxed?.products?.length) {
                result = relaxed;
            }
        }

        const verifiedUpvotes = await verifyProductHuntUpvotes(date, result.products.map((product) => ({
            name: product.name,
            productHuntUrl: product.productHuntUrl
        })));

        let verifiedCount = 0;
        const normalized = result.products.map((product) => ({
            ...product,
            upvotes: normalizeUpvotes(product.upvotes),
        }));

        const withVerified = normalized.map((product) => {
            const urlKey = (product.productHuntUrl || "").trim().toLowerCase();
            const nameKey = (product.name || "").trim().toLowerCase();
            const verified = verifiedUpvotes.get(urlKey) ?? verifiedUpvotes.get(nameKey);

            if (typeof verified === "number") {
                verifiedCount += 1;
                return { ...product, upvotes: verified, upvotesVerified: true };
            }

            return { ...product, upvotesVerified: false };
        });

        send({ type: "log", message: `🔎 Verified upvotes for ${verifiedCount}/${result.products.length} products.` });

        const filtered = withVerified.filter((product) => {
            if (normalizeUpvotes(product.upvotes) < minUpvotes) return false;
            if (maxUpvotes > 0 && normalizeUpvotes(product.upvotes) > maxUpvotes) return false;
            return true;
        });

        send({ type: "status", message: `✅ Found ${filtered.length} products matching criteria.` });

        // Send the complete list
        send({
            type: "complete",
            data: filtered,
            summary: {
                total_found: result.total_found,
                matching_count: filtered.length,
                date: result.date,
                minUpvotes,
                maxUpvotes: maxUpvotes > 0 ? maxUpvotes : null,
                verifiedCount
            }
        });

    } catch (error: any) {
        console.error("Grounded Scanner Error:", error);
        send({ type: "error", message: `Critical error: ${error.message || error}` });
    }
}
