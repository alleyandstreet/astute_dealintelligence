import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import { verifyPassword } from "./password";
import { logActivity } from "./activity-logger";

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
                token.id = user.id;
                token.role = (user as any).role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
            }
            return session;
        }
    }
};
