import path from "node:path";
import fs from "node:fs";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const protectedEnvKeys = new Set(Object.keys(process.env));

function loadEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, "utf8");
    for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf("=");
        if (idx === -1) continue;
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
        if (protectedEnvKeys.has(key)) continue;
        process.env[key] = value;
    }
}

loadEnvFile(path.resolve(process.cwd(), ".env"));
loadEnvFile(path.resolve(process.cwd(), ".env.local"));
loadEnvFile(path.resolve(process.cwd(), ".env.production"));

function assertPostgresDatabaseUrl() {
    const raw = (process.env.DATABASE_URL || "").trim();
    if (!raw) {
        throw new Error("DATABASE_URL is required for admin bootstrap.");
    }

    const validPrefixes = ["postgresql://", "postgres://", "prisma+postgres://"];
    if (!validPrefixes.some((prefix) => raw.startsWith(prefix))) {
        throw new Error(
            `DATABASE_URL must be a PostgreSQL URL. Received: ${raw}`,
        );
    }
}

assertPostgresDatabaseUrl();
const db = new PrismaClient();

async function ensureAdmin() {
    const username = (process.env.ADMIN_USERNAME || "").trim();
    const password = process.env.ADMIN_PASSWORD || "";
    const email = (process.env.ADMIN_EMAIL || "").trim() || null;

    if (!username || !password) {
        console.log("Skipping admin bootstrap: ADMIN_USERNAME or ADMIN_PASSWORD is not set.");
        return;
    }

    const existing = await db.user.findUnique({ where: { username } });

    if (!existing) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.user.create({
            data: {
                username,
                password: hashedPassword,
                email,
                role: "super_admin",
            },
        });
        console.log(`Created super admin user "${username}".`);
        return;
    }

    if (existing.role !== "super_admin") {
        await db.user.update({
            where: { id: existing.id },
            data: {
                role: "super_admin",
                email: email ?? existing.email,
            },
        });
        console.log(`Updated "${username}" to super_admin.`);
        return;
    }

    console.log(`Admin user "${username}" already exists.`);
}

ensureAdmin()
    .catch((error) => {
        console.error("Admin bootstrap failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await db.$disconnect();
    });
