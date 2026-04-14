import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jobManager } from "@/lib/unified-search/job-manager";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const { session, response } = await requireAuth();
    if (response) return response;

    const userId = (session?.user as any)?.id;
    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId");

    if (jobId) {
        const job = jobManager.getJob(jobId);
        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }
        
        // Safety check: ensure users can only see their own jobs if userId exists
        if (userId && job.userId && job.userId !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        return NextResponse.json(job);
    }

    // List all jobs for the user
    const jobs = jobManager.listJobs(userId).sort((a, b) => b.createdAt - a.createdAt);
    return NextResponse.json(jobs);
}
