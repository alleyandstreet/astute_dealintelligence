"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Menu } from "lucide-react";

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
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 shadow-lg">
                        <img src="/brand-logo.jpg" alt="Alley & Street" className="w-full h-full object-cover" />
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
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

                {/* Main Content Area */}
                <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}
