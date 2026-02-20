import { db } from "./src/lib/db";

async function checkUser() {
    try {
        const user = await db.user.findUnique({
            where: { username: "admin" },
        });
        console.log("User details:", JSON.stringify(user, null, 2));
    } catch (error) {
        console.error("Error checking user:", error);
    } finally {
        await db.$disconnect();
    }
}

checkUser();
