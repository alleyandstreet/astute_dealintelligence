"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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

    const refreshJobs = useCallback(async () => {
        try {
            const res = await fetch("/api/scan/jobs");
            if (!res.ok) throw new Error("Failed to fetch jobs");
            const data: ScanJob[] = await res.json();
            
            // Check for newly completed jobs to show notifications
            data.forEach(newJob => {
                const oldJob = jobs.find(j => j.id === newJob.id);
                if (newJob.status === "completed" && oldJob?.status !== "completed") {
                    const deals = newJob.metrics?.dealsCreated || 0;
                    if (deals > 0) {
                        toast.success(`Scan Complete: ${newJob.platform}`, {
                            description: `Found ${deals} new qualified deals!`,
                            action: {
                                label: "View Deals",
                                onClick: () => window.location.href = "/deals"
                            }
                        });
                    } else {
                        toast.info(`Scan Complete: ${newJob.platform}`, {
                            description: "No new deals found this time."
                        });
                    }
                } else if (newJob.status === "failed" && oldJob?.status !== "failed") {
                    toast.error(`Scan Failed: ${newJob.platform}`, {
                        description: newJob.error || "An unknown error occurred"
                    });
                }
            });

            setJobs(data);
            setActiveJobs(data.filter(j => j.status === "running" || j.status === "pending"));
        } catch (error) {
            console.error("ScraperProvider refresh error:", error);
        }
    }, [jobs]);

    // Initial fetch and polling
    useEffect(() => {
        refreshJobs();
        const interval = setInterval(refreshJobs, 3000); // Poll every 3 seconds
        return () => clearInterval(interval);
    }, [refreshJobs]);

    const startScan = async (platform: string, config: any) => {
        try {
            const res = await fetch("/api/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...config, platform }),
            });
            
            if (!res.ok) {
                const text = await res.text();
                console.error(`API error from /api/scan (status: ${res.status}):`, text);
                toast.error(`Scan failed (${res.status})`, { description: text.slice(0, 50) });
                return null;
            }

            const data = await res.json();
            if (data.jobId) {
                toast.info(`Started ${platform} scan`, {
                    description: "Running in background..."
                });
                await refreshJobs();
                return data.jobId;
            } else {
                toast.error("Failed to start scan", { description: data.error });
                return null;
            }
        } catch (error) {
            console.error("Network error starting scan:", error);
            toast.error("Network error starting scan");
            return null;
        }
    };

    const getJob = (jobId: string) => jobs.find(j => j.id === jobId);

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
