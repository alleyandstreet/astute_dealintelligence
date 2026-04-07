"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";
import ContentSidebar from "@/components/ContentSidebar";
import MarketIntelligenceSidebar from "@/components/MarketIntelligenceSidebar";
import TeamCrmSidebar from "@/components/TeamCrmSidebar";
import { Menu } from "lucide-react";
import { AstuteLogo } from "@/components/AstuteLogo";
import { CommandPalette } from "@/components/CommandPalette";
import { getFeatureFromPath, type HubFeatureKey } from "@/lib/feature-access";

export function LayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [featureAccess, setFeatureAccess] = useState<Record<HubFeatureKey, boolean> | null | undefined>(undefined);
    const isLoginPage = pathname === "/login";

    const isHubPage = pathname === "/";
    const isMarketingPage = pathname?.startsWith("/marketing");
    const isCalendarPage = pathname?.startsWith("/calendar");
    const isHooksPage = pathname === "/marketing/hooks";
    const isMarketIntelligencePage = pathname?.startsWith("/market-intelligence");
    const isTeamCrmPage = pathname?.startsWith("/crm");
    const isAdminPage = pathname?.startsWith("/admin");
    const isPostPage = pathname?.startsWith("/p/");
    const isBridgePage = pathname?.startsWith("/bridge/");

    const isContentPlatform = isMarketingPage || isCalendarPage || isHooksPage;
    const requiredFeature = getFeatureFromPath(pathname || "");

    useEffect(() => {
        if (isLoginPage || isHubPage) return;

        let active = true;

        fetch("/api/access/me")
            .then(async (response) => {
                if (!response.ok) throw new Error("Failed to fetch access profile");
                return response.json();
            })
            .then((payload) => {
                if (!active) return;
                setFeatureAccess((payload?.features || null) as Record<HubFeatureKey, boolean> | null);
            })
            .catch((error) => {
                console.error(error);
                if (!active) return;
                setFeatureAccess(null);
            });

        return () => {
            active = false;
        };
    }, [isHubPage, isLoginPage, pathname]);

    useEffect(() => {
        if (!requiredFeature || !featureAccess) return;
        if (featureAccess[requiredFeature]) return;
        router.replace("/");
    }, [featureAccess, requiredFeature, router]);

    // Full screen layout (No Sidebar) for Login, Hub, Admin, and Public Post Bridge
    if (isLoginPage || isHubPage || isAdminPage || isPostPage || isBridgePage) {
        return (
            <main className="min-h-screen">
                {children}
                <CommandPalette />
            </main>
        );
    }

    if (requiredFeature && featureAccess === undefined) {
        return (
            <main className="min-h-screen flex items-center justify-center p-8">
                <div className="text-center">
                    <p className="text-white text-lg font-semibold">Loading Module Access...</p>
                </div>
            </main>
        );
    }

    if (requiredFeature && featureAccess && !featureAccess[requiredFeature]) {
        return (
            <main className="min-h-screen flex items-center justify-center p-8">
                <div className="text-center">
                    <p className="text-white text-lg font-semibold">Access Restricted</p>
                    <p className="text-[var(--text-muted)] text-sm">Your account currently does not have permission for this module.</p>
                </div>
            </main>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[var(--background)]">
            <CommandPalette />
            {/* Mobile Header */}
            <header className="lg:hidden h-16 bg-[var(--background)] border-b border-[var(--border)] flex items-center justify-between px-4 sticky top-0 z-40 backdrop-blur">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-sky-500 flex items-center justify-center shadow-lg">
                        <AstuteLogo className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-semibold text-white tracking-tight">Astute</span>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 text-zinc-400 hover:text-white transition-colors"
                    aria-label="Open menu"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </header>

            <div className="flex flex-1">
                <Suspense fallback={null}>
                    {isContentPlatform ? (
                        <ContentSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                    ) : isMarketIntelligencePage ? (
                        <MarketIntelligenceSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                    ) : isTeamCrmPage ? (
                        <TeamCrmSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                    ) : (
                        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                    )}
                </Suspense>

                {/* Main Content Area */}
                <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 overflow-x-hidden min-h-screen fade-in-up">
                    {children}
                </main>
            </div>
        </div>
    );
}
