import fs from "node:fs";
import path from "node:path";

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

const required = ["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET"];
const missing = required.filter((key) => !process.env[key] || !process.env[key].trim());

if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
}

const rawDatabaseUrl = (process.env.DATABASE_URL || "").trim();
const validDatabasePrefixes = ["postgresql://", "postgres://", "prisma+postgres://"];
if (!validDatabasePrefixes.some((prefix) => rawDatabaseUrl.startsWith(prefix))) {
    console.error(
        `DATABASE_URL must be a PostgreSQL URL. Received: ${rawDatabaseUrl}`,
    );
    process.exit(1);
}

if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    console.warn("ADMIN_USERNAME or ADMIN_PASSWORD is missing; admin auto-bootstrap will be skipped.");
}

if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    console.warn("No AI provider key found (GEMINI_API_KEY or OPENAI_API_KEY). AI features may be unavailable.");
}

console.log("Deployment check passed.");
