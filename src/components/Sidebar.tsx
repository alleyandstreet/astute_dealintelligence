"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Search,
    Kanban,
    BarChart3,
    Settings,
    Briefcase,
    Zap,
    LogOut,
    HelpCircle,
    ShieldAlert,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/sources", label: "Search", icon: Search },
    { href: "/pipeline", label: "Pipeline", icon: Kanban },
    { href: "/deals", label: "Deals", icon: Briefcase },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/support", label: "Support", icon: HelpCircle },
];

export default function Sidebar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const isLoginPage = pathname === "/login";

    if (isLoginPage) return null;

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-[var(--card)] border-r border-[var(--border)] flex flex-col z-50">
            {/* Logo */}
            <div className="p-6 border-b border-[var(--border)]">
                <Link href="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                        <img src="/logo.jpg" alt="Alley & Street" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h1 className="font-semibold text-lg text-white">Astute</h1>
                        <p className="text-xs text-[var(--text-dim)]">PE Intelligence</p>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 ${isActive
                                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                                : "text-[var(--text-muted)] hover:bg-[var(--card-hover)] hover:text-white"
                                }`}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    );
                })}

                {/* Secure Super Admin Entry Pointer */}
                {session?.user && (session.user as any).role === "super_admin" && (
                    <Link
                        href="/admin"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-amber-400 hover:bg-amber-400/10 transition-all border border-transparent hover:border-amber-400/20 mt-4 group"
                    >
                        <ShieldAlert className="w-5 h-5 group-hover:animate-pulse" />
                        <span className="font-bold">Admin Control</span>
                    </Link>
                )}
            </nav>

            {/* Bottom section */}
            <div className="p-4 border-t border-[var(--border)]">
                <Link
                    href="/settings"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-[var(--text-muted)] hover:bg-[var(--card-hover)] hover:text-white transition-all"
                >
                    <Settings className="w-5 h-5" />
                    <span className="font-medium">Settings</span>
                </Link>

                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full mt-1 flex items-center gap-3 px-4 py-3 rounded-lg text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all text-left"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Logout</span>
                </button>

                {/* Stats card */}
                <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20">
                    <p className="text-xs text-[var(--text-dim)] mb-1">Active Deals</p>
                    <p className="text-2xl font-bold text-cyan-400">--</p>
                </div>
            </div>
        </aside>
    );
}
