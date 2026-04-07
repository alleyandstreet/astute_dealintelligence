import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import { verifyPassword } from "./password";
import { logActivity } from "./activity-logger";
import { NextResponse } from "next/server";
import type { HubFeatureKey } from "@/lib/feature-access";
import { canUserAccessFeature, enforceTeamRateLimit, type TeamRateLimitKey } from "@/lib/team-controls";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Astute Portal",
            credentials: {
                username: { label: "Username", type: "text", placeholder: "team_member" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) {
                    return null;
                }

                try {
                    // Find user in database
                    const user = await db.user.findUnique({
                        where: { username: credentials.username },
                    });

                    if (!user || !user.isActive) {
                        return null;
                    }

                    // Verify password
                    const isValidPassword = await verifyPassword(
                        credentials.password,
                        user.password
                    );

                    if (!isValidPassword) {
                        return null;
                    }

                    // Update last login
                    await db.user.update({
                        where: { id: user.id },
                        data: { lastLogin: new Date() },
                    });

                    // Log activity (don't await to avoid blocking login)
                    logActivity({
                        userId: user.id,
                        action: "login",
                    }).catch(console.error);

                    return {
                        id: user.id,
                        name: user.username,
                        email: user.email || undefined,
                        role: user.role,
                    };
                } catch (error) {
                    console.error("Auth error:", error);
                    return null;
                }
            }
        })
    ],
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                const typedUser = user as { id?: string; role?: string; email?: string | null };
                token.id = typedUser.id;
                token.role = typedUser.role;
                token.email = typedUser.email;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                const typedSessionUser = session.user as { id?: string; role?: string; email?: string | null };
                typedSessionUser.id = token.id as string | undefined;
                typedSessionUser.role = token.role as string | undefined;
                typedSessionUser.email = token.email as string | undefined;
            }
            return session;
        }
    }
};

/**
 * Helper to require authentication in API routes.
 * Optionally enforces feature-level access and configurable rate limits.
 */
export async function requireAuth(options?: {
    feature?: HubFeatureKey;
    rateLimitKey?: TeamRateLimitKey;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return { session: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }

    const sessionUser = session.user as { id?: string; role?: string };
    if (!sessionUser.id) {
        return { session: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }

    if (options?.feature) {
        const allowed = await canUserAccessFeature(sessionUser.id, sessionUser.role, options.feature);
        if (!allowed) {
            return {
                session: null,
                response: NextResponse.json(
                    { error: "Forbidden: You do not have access to this feature" },
                    { status: 403 },
                ),
            };
        }
    }

    if (options?.rateLimitKey) {
        const result = await enforceTeamRateLimit({
            key: options.rateLimitKey,
            userId: sessionUser.id,
        });

        if (!result.allowed) {
            return {
                session: null,
                response: NextResponse.json(
                    {
                        error: `Rate limit exceeded for this feature. Please retry in ${result.retryAfterSeconds}s.`,
                    },
                    {
                        status: 429,
                        headers: {
                            "Retry-After": String(result.retryAfterSeconds),
                        },
                    },
                ),
            };
        }
    }

    return { session, response: null };
}
