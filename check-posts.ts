import { db } from "./src/lib/db";

async function main() {
    const posts = await db.scheduledPost.findMany();
    console.log("Scheduled Posts:", JSON.stringify(posts, null, 2));
}

main();
