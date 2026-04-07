import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { logActivity } from "@/lib/activity-logger";
import { autoAssignDefaultOnboardingTemplate } from "@/lib/team-controls";

type SessionUser = {
    id?: string;
    role?: string;
};

const ROLE_ALIASES: Record<string, string> = {
    member: "member",
    intern: "intern",
    admin: "admin",
    super_admin: "super_admin",
    "super admin": "super_admin",
    "super-admin": "super_admin",
};

function normalizeRole(input: unknown): string {
    const candidate = String(input ?? "member").trim().toLowerCase();
    return ROLE_ALIASES[candidate] ?? "member";
}

function parseOptionalEmail(input: unknown): string | null {
    const email = String(input ?? "").trim();
    return email.length > 0 ? email : null;
}

export async function GET() {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as SessionUser | undefined;

    if (!session || sessionUser?.role !== "super_admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const users = await db.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isActive: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json({ users });
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json(
            { error: "Failed to fetch users" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as SessionUser | undefined;

    if (!session || sessionUser?.role !== "super_admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { username, password, email, role } = body;
        const normalizedUsername = String(username ?? "").trim();
        const normalizedPassword = String(password ?? "");
        const normalizedRole = normalizeRole(role);
        const normalizedEmail = parseOptionalEmail(email);

        if (!normalizedUsername || !normalizedPassword) {
            return NextResponse.json(
                { error: "Username and password are required" },
                { status: 400 }
            );
        }

        // Check if username already exists
        const existing = await db.user.findUnique({
            where: { username: normalizedUsername },
        });

        if (existing) {
            return NextResponse.json(
                { error: "Username already exists" },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await hashPassword(normalizedPassword);

        // Create user
        const user = await db.user.create({
            data: {
                username: normalizedUsername,
                password: hashedPassword,
                email: normalizedEmail,
                role: normalizedRole,
            },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        });

        // Onboarding assignment is best-effort and should never block user creation.
        try {
            await autoAssignDefaultOnboardingTemplate({
                userId: user.id,
                assignedById: sessionUser?.id || null,
            });
        } catch (onboardingError) {
            console.error("Auto-assign onboarding failed after user creation:", onboardingError);
        }

        // Log activity
        if (sessionUser?.id) {
            await logActivity({
                userId: sessionUser.id,
                action: "user_created",
                details: `Created user: ${normalizedUsername}`,
            });
        }

        return NextResponse.json({ user }, { status: 201 });
    } catch (error) {
        console.error("Error creating user:", error);
        const message = error instanceof Error ? error.message : "Failed to create user";
        return NextResponse.json(
            { error: message || "Failed to create user" },
            { status: 500 }
        );
    }
}
