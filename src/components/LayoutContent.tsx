"use client";

import { useState, Suspense } from "react";
import { usePathname } from "next/navigation";

import Sidebar from "@/components/Sidebar";
import ContentSidebar from "@/components/ContentSidebar";
import MarketIntelligenceSidebar from "@/components/MarketIntelligenceSidebar";
import { Menu } from "lucide-react";
import { AstuteLogo } from "@/components/AstuteLogo";
import { CommandPalette } from "@/components/CommandPalette";

export function LayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const isLoginPage = pathname === "/login";

    const isHubPage = pathname === "/";
    const isMarketingPage = pathname?.startsWith("/marketing");
    const isCalendarPage = pathname?.startsWith("/calendar");
    const isHooksPage = pathname === "/marketing/hooks";
    const isMarketIntelligencePage = pathname?.startsWith("/market-intelligence");
    const isAdminPage = pathname?.startsWith("/admin");
    const isPostPage = pathname?.startsWith("/p/");
    const isBridgePage = pathname?.startsWith("/bridge/");

    const isContentPlatform = isMarketingPage || isCalendarPage || isHooksPage;

    // Full screen layout (No Sidebar) for Login, Hub, Admin, and Public Post Bridge
    if (isLoginPage || isHubPage || isAdminPage || isPostPage || isBridgePage) {
        return (
            <main className="min-h-screen">
                {children}
                <CommandPalette />
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
