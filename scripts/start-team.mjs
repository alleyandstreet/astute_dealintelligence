import { spawn } from "node:child_process";
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

async function run(command, args) {
    await new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: "inherit",
            env: process.env,
            shell: process.platform === "win32",
        });
        child.on("error", reject);
        child.on("exit", (code) => {
            if (code === 0) resolve(undefined);
            else reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
        });
    });
}

async function main() {
    process.env.NODE_ENV = "production";

    loadEnvFile(path.resolve(process.cwd(), ".env"));
    loadEnvFile(path.resolve(process.cwd(), ".env.local"));
    loadEnvFile(path.resolve(process.cwd(), ".env.production"));

    await run("node", ["scripts/deploy-check.mjs"]);
    await run("npx", ["prisma", "db", "push"]);
    await run("node", ["scripts/ensure-admin.mjs"]);
    await run("npx", ["next", "start"]);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
