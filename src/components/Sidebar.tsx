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
    X,
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

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const isLoginPage = pathname === "/login";

    if (isLoginPage) return null;

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside className={`fixed left-0 top-0 h-screen w-64 bg-[var(--card)] border-r border-[var(--border)] flex flex-col z-[70] transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Logo & Close Button */}
                <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3" onClick={onClose}>
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                            <img src="/brand-logo.jpg" alt="Alley & Street" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h1 className="font-semibold text-lg text-white leading-tight">Astute</h1>
                            <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">Intelligence</p>
                        </div>
                    </Link>
                    <button
                        onClick={onClose}
                        className="lg:hidden p-2 text-[var(--text-muted)] hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 ${isActive
                                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
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
                            onClick={onClose}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-amber-400 hover:bg-amber-400/10 transition-all border border-transparent hover:border-amber-400/20 mt-4 group"
                        >
                            <ShieldAlert className="w-5 h-5 group-hover:animate-pulse" />
                            <span className="font-bold">Admin Control</span>
                        </Link>
                    )}
                </nav>

                {/* Bottom section */}
                <div className="p-4 border-t border-[var(--border)] bg-[#121214]">
                    <Link
                        href="/settings"
                        onClick={onClose}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-[var(--text-muted)] hover:bg-[var(--card-hover)] hover:text-white transition-all mb-1"
                    >
                        <Settings className="w-5 h-5" />
                        <span className="font-medium">Settings</span>
                    </Link>

                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all text-left"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Logout</span>
                    </button>

                    {/* Stats card (hidden on very small screens to save space) */}
                    <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 hidden sm:block">
                        <p className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] mb-1 font-semibold">Live System</p>
                        <div className="flex items-center justify-between">
                            <p className="text-xl font-bold text-cyan-400">Online</p>
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
