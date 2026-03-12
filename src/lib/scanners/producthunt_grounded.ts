import { scrapeProductHuntWithGrounding, ProductHuntGroundedListing } from "@/lib/gemini";

export async function getGroundedProductHuntDeals(
    date: string,
    minUpvotes: number,
    maxUpvotes: number,
    send: (data: any) => void
) {
    send({ type: "status", message: `🛡️ Starting Grounded Product Hunt scan for ${date}...` });
    send({ id: "init", type: "log", message: "Connecting to Gemini 2.0 with Google Search grounding..." });

    try {
        const result = await scrapeProductHuntWithGrounding(date, minUpvotes, maxUpvotes);

        if (!result || !result.products) {
            send({ type: "error", message: "Failed to extract products from Product Hunt using Gemini grounding." });
            return;
        }

        const filtered = result.products.filter((product) => {
            if (product.upvotes < minUpvotes) return false;
            if (maxUpvotes > 0 && product.upvotes > maxUpvotes) return false;
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
                maxUpvotes: maxUpvotes > 0 ? maxUpvotes : null
            }
        });

    } catch (error: any) {
        console.error("Grounded Scanner Error:", error);
        send({ type: "error", message: `Critical error: ${error.message || error}` });
    }
}
