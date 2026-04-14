import { requireAuth } from "@/lib/auth";
import { getUserFeatureAccessMap, getLatestOnboardingAssignment } from "@/lib/team-controls";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const { session, response } = await requireAuth();
    if (response) return response;

    const user = session?.user as { id?: string; role?: string };
    if (!user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const [features, onboardingAssignment] = await Promise.all([
            getUserFeatureAccessMap(user.id, user.role),
            getLatestOnboardingAssignment(user.id),
        ]);

        return NextResponse.json({
            userId: user.id,
            role: user.role || null,
            features,
            onboarding: onboardingAssignment
                ? {
                    id: onboardingAssignment.id,
                    status: onboardingAssignment.status,
                    dueDate: onboardingAssignment.dueDate,
                    startedAt: onboardingAssignment.startedAt,
                    completedAt: onboardingAssignment.completedAt,
                    template: onboardingAssignment.template,
                }
                : null,
        });
    } catch (error) {
        console.error("Access me endpoint error:", error);
        return NextResponse.json({ error: "Failed to resolve access profile" }, { status: 500 });
    }
}

