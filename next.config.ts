import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    serverExternalPackages: ["@prisma/client", "better-sqlite3"],
    turbopack: {
        root: process.cwd(),
    },
};

export default nextConfig;
