import { db } from "./src/lib/db";

async function test() {
    console.log("Testing database connection...");
    try {
        const count = await db.deal.count();
        console.log(`✅ Connection successful! Deal count: ${count}`);
    } catch (e) {
        console.error("❌ Connection failed:", e);
    } finally {
        process.exit();
    }
}

test();
