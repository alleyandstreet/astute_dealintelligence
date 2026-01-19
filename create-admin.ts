import { db } from "./src/lib/db";
import { hashPassword } from "./src/lib/password";

async function createSuperAdmin() {
    try {
        // Check if super_admin already exists
        const existing = await db.user.findFirst({
            where: { role: "super_admin" },
        });

        if (existing) {
            console.log("Super admin already exists:", existing.username);
            return;
        }

        // Create super_admin user
        const hashedPassword = await hashPassword("alleyandstreet2026");

        const superAdmin = await db.user.create({
            data: {
                username: "admin",
                password: hashedPassword,
                email: "admin@alleyandstreet.com",
                role: "super_admin",
            },
        });

        console.log("Super admin created successfully!");
        console.log("Username:", superAdmin.username);
        console.log("Password: alleyandstreet2026");
        console.log("\nYou can now login and access the admin dashboard at /admin");
    } catch (error) {
        console.error("Error creating super admin:", error);
    } finally {
        await db.$disconnect();
    }
}

createSuperAdmin();
