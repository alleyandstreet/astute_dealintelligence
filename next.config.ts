import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
    output: "standalone",
    serverExternalPackages: ["@prisma/client"],
    eslint: {
        ignoreDuringBuilds: true,
    },
    transpilePackages: [
        "three",
        "@react-three/fiber",
        "@react-three/drei",
        "framer-motion"
    ],
    turbopack: {
        resolveAlias: {
            "@radix-ui/react-id": "./node_modules/@radix-ui/react-id/dist/index.mjs",
            "@radix-ui/react-use-callback-ref": "./node_modules/@radix-ui/react-use-callback-ref/dist/index.mjs",
        },
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
