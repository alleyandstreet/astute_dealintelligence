"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { ScanJob } from "@/lib/unified-search/job-manager";

interface ScraperContextType {
    jobs: ScanJob[];
    activeJobs: ScanJob[];
    startScan: (platform: string, config: any) => Promise<string | null>;
    getJob: (jobId: string) => ScanJob | undefined;
    refreshJobs: () => Promise<void>;
}

const ScraperContext = createContext<ScraperContextType | undefined>(undefined);

export function ScraperProvider({ children }: { children: React.ReactNode }) {
    const [jobs, setJobs] = useState<ScanJob[]>([]);
    const [activeJobs, setActiveJobs] = useState<ScanJob[]>([]);

    // Track which jobs we've already shown notifications for (prevents duplicates)
    const notifiedJobs = useRef<Set<string>>(new Set());

    const refreshJobs = useCallback(async () => {
        try {
            const res = await fetch("/api/scan/jobs");
            if (!res.ok) return;
            const data: ScanJob[] = await res.json();

            // Show ONE notification per job when it finishes
            for (const job of data) {
                const jobNotifKey = `${job.id}:${job.status}`;
                if (notifiedJobs.current.has(jobNotifKey)) continue;

                if (job.status === "completed") {
                    notifiedJobs.current.add(jobNotifKey);
                    const deals = job.metrics?.dealsCreated || 0;
                    if (deals > 0) {
                        toast.success(`Scan Complete: ${job.platform}`, {
                            description: `Found ${deals} new deals!`,
                            action: {
                                label: "View Deals",
                                onClick: () => window.location.href = "/deals"
                            }
                        });
                    }
                    // Don't toast "no deals found" — it's noise
                } else if (job.status === "failed") {
                    notifiedJobs.current.add(jobNotifKey);
                    toast.error(`Scan Failed: ${job.platform}`, {
                        description: (job.error || "Unknown error").slice(0, 100),
                    });
                }
            }

            setJobs(data);
            setActiveJobs(data.filter(j => j.status === "running" || j.status === "pending"));
        } catch {
            // Silently ignore polling errors
        }
    }, []); // No dependencies — stable function

    // Poll every 4 seconds
    useEffect(() => {
        refreshJobs();
        const interval = setInterval(refreshJobs, 4000);
        return () => clearInterval(interval);
    }, [refreshJobs]);

    const startScan = useCallback(async (platform: string, config: any) => {
        try {
            const res = await fetch("/api/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...config, platform }),
            });
            
            if (!res.ok) {
                const text = await res.text();
                console.error(`Scan API error (${res.status}):`, text);
                toast.error(`Scan failed (${res.status})`);
                return null;
            }

            const data = await res.json();
            if (data.jobId) {
                toast.info(`Started ${platform} scan`);
                await refreshJobs();
                return data.jobId;
            } else {
                toast.error("Failed to start scan");
                return null;
            }
        } catch {
            toast.error("Network error starting scan");
            return null;
        }
    }, [refreshJobs]);

    const getJob = useCallback((jobId: string) => jobs.find(j => j.id === jobId), [jobs]);

    return (
        <ScraperContext.Provider value={{ jobs, activeJobs, startScan, getJob, refreshJobs }}>
            {children}
        </ScraperContext.Provider>
    );
}

export function useScraper() {
    const context = useContext(ScraperContext);
    if (!context) {
        throw new Error("useScraper must be used within a ScraperProvider");
    }
    return context;
}
