"use client";

import { useState, Suspense } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Menu } from "lucide-react";
import { AstuteLogo } from "@/components/AstuteLogo";

export function LayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const isLoginPage = pathname === "/login";

    if (isLoginPage) {
        return <main className="min-h-screen">{children}</main>;
    }

    return (
        <div className="flex flex-col min-h-screen">
            {/* Mobile Header */}
            <header className="lg:hidden h-16 bg-[var(--card)] border-b border-[var(--border)] flex items-center justify-between px-4 sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <AstuteLogo className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-semibold text-white tracking-tight">Astute</span>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 text-[var(--text-muted)] hover:text-white transition-colors"
                    aria-label="Open menu"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </header>

            <div className="flex flex-1">
                <Suspense fallback={null}>
                    <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                </Suspense>

                {/* Main Content Area */}
                <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}
