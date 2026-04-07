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
    webpack: (config) => {
        config.resolve = config.resolve || {};
        config.resolve.alias = {
            ...(config.resolve.alias || {}),
            "@radix-ui/react-id": path.resolve(process.cwd(), "node_modules/@radix-ui/react-id/dist/index.mjs"),
            "@radix-ui/react-use-callback-ref": path.resolve(
                process.cwd(),
                "node_modules/@radix-ui/react-use-callback-ref/dist/index.mjs"
            ),
        };
        return config;
    },
};

export default nextConfig;
