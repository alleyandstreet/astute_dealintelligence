import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "super_admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const businesses = await db.business.findMany({
            include: {
                owner: {
                    select: {
                        username: true,
                        email: true,
                    }
                }
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json({ businesses });
    } catch (error) {
        console.error("Error fetching businesses:", error);
        return NextResponse.json(
            { error: "Failed to fetch businesses" },
            { status: 500 }
        );
    }
}
