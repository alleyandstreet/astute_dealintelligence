import { UnifiedSearchInput, UnifiedSearchSummary } from "./types";

export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface ScanLog {
    timestamp: number;
    message: string;
    type: "log" | "status" | "error" | "metric";
}

export interface ScanJob {
    id: string;
    platform: string;
    status: JobStatus;
    input: UnifiedSearchInput;
    logs: ScanLog[];
    metrics: Record<string, any>;
    summary?: UnifiedSearchSummary;
    error?: string;
    createdAt: number;
    updatedAt: number;
    userId?: string;
}

class ScanJobManager {
    private jobs = new Map<string, ScanJob>();
    private maxJobsPerPlatform = 10;

    createJob(id: string, platform: string, input: UnifiedSearchInput, userId?: string): ScanJob {
        const job: ScanJob = {
            id,
            platform,
            status: "pending",
            input,
            logs: [],
            metrics: {},
            createdAt: Date.now(),
            updatedAt: Date.now(),
            userId,
        };
        this.jobs.set(id, job);
        this.pruneJobs(platform);
        return job;
    }

    updateJob(id: string, updates: Partial<ScanJob>) {
        const job = this.jobs.get(id);
        if (job) {
            Object.assign(job, { ...updates, updatedAt: Date.now() });
        }
    }

    addLog(id: string, log: Omit<ScanLog, "timestamp">) {
        const job = this.jobs.get(id);
        if (job) {
            job.logs.push({ ...log, timestamp: Date.now() });
            job.updatedAt = Date.now();
            
            // Limit log volume in memory
            if (job.logs.length > 500) {
                job.logs.shift();
            }
        }
    }

    getJob(id: string): ScanJob | undefined {
        return this.jobs.get(id);
    }

    listJobs(userId?: string): ScanJob[] {
        const allJobs = Array.from(this.jobs.values());
        if (userId) {
            return allJobs.filter(j => j.userId === userId);
        }
        return allJobs;
    }

    private pruneJobs(platform: string) {
        const platformJobs = this.listJobs().filter(j => j.platform === platform);
        if (platformJobs.length > this.maxJobsPerPlatform) {
            const toRemove = platformJobs
                .sort((a, b) => a.createdAt - b.createdAt)
                .slice(0, platformJobs.length - this.maxJobsPerPlatform);
            
            toRemove.forEach(j => this.jobs.delete(j.id));
        }
    }
}

export const jobManager = new ScanJobManager();
