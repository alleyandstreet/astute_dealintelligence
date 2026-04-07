import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

function validateDatabaseUrl() {
    const raw = process.env.DATABASE_URL?.trim();
    if (!raw) {
        throw new Error("DATABASE_URL is required for PostgreSQL deployment.");
    }

    const validPrefixes = ["postgresql://", "postgres://", "prisma+postgres://"];
    if (!validPrefixes.some((prefix) => raw.startsWith(prefix))) {
        throw new Error(
            `Invalid DATABASE_URL "${raw}". Expected a PostgreSQL URL (postgresql:// or postgres://).`,
        );
    }
}

const createPrismaClient = () => {
    validateDatabaseUrl();
    return new PrismaClient();
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
}
