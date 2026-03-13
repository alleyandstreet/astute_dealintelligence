import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
    serverExternalPackages: ["@prisma/client", "better-sqlite3"],
    eslint: {
        ignoreDuringBuilds: true,
    },
    turbopack: {
        root: path.resolve(process.cwd()),
    },
};

export default nextConfig;
