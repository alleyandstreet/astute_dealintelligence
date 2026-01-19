import { PrismaClient } from "@prisma/client";
import path from "path";

async function test() {
    const dbPath = path.join(process.cwd(), "prisma", "dev.db").replace(/\\/g, "/");
    const databaseUrl = `file:${dbPath}`;

    console.log("Testing direct Prisma initialization with URL:", databaseUrl);

    process.env.DATABASE_URL = databaseUrl;
    try {
        const prisma = new PrismaClient();

        const count = await prisma.deal.count();
        console.log(`✅ Success! Deal count: ${count}`);
        await prisma.$disconnect();
    } catch (e) {
        console.error("❌ Direct initialization failed:", e);
    }
}

test();
