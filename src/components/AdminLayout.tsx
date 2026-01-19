"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Activity, LayoutDashboard } from "lucide-react";

interface AdminLayoutProps {
    children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const pathname = usePathname();

    const navItems = [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/users", label: "Users", icon: Users },
        { href: "/admin/logs", label: "Activity Logs", icon: Activity },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="flex">
                {/* Sidebar */}
                <aside className="w-64 min-h-screen bg-slate-900/50 backdrop-blur-sm border-r border-slate-700/50">
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-white mb-6">Admin Panel</h2>
                        <nav className="space-y-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                                                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                                : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                                            }`}
                                    >
                                        <Icon size={20} />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8">{children}</main>
            </div>
        </div>
    );
}
