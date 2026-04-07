"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    CalendarClock,
    LayoutDashboard,
    Layers,
    LogOut,
    Settings,
    Users,
    X,
} from "lucide-react";
import { signOut } from "next-auth/react";

type NavItem = {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
    { href: "/", label: "Hub", icon: Layers },
    { href: "/crm", label: "CRM Workspace", icon: LayoutDashboard },
    { href: "/crm/attendance", label: "Intern Hours", icon: CalendarClock },
];

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function TeamCrmSidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside className={`fixed left-0 top-0 h-screen w-64 bg-[var(--background-elevated)] border-r border-[var(--border)] flex flex-col z-[70] transition-transform duration-300 lg:translate-x-0 backdrop-blur ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="relative p-6 border-b border-[var(--border)]">
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-400/10 to-cyan-500/10" />
                    <div className="relative flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-3 group" onClick={onClose}>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-lg text-white leading-tight group-hover:text-cyan-300 transition-colors">Astute</h1>
                                <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">Team CRM</p>
                            </div>
                        </Link>
                        <button
                            onClick={onClose}
                            className="lg:hidden p-2 text-[var(--text-muted)] hover:text-white hover:bg-[var(--background)] rounded-lg transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <nav className="flex-1 py-6 px-3 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={`flex items-center gap-3 py-3 px-4 rounded-lg transition-all duration-200 mb-1 ${isActive
                                    ? "bg-[color:rgba(45,212,191,0.12)] text-teal-200 border border-[color:rgba(45,212,191,0.35)] shadow-[0_0_16px_rgba(45,212,191,0.18)]"
                                    : "text-[var(--text-muted)] hover:bg-[var(--card-hover)]/70 hover:text-white"
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-[var(--border)] bg-[var(--background-elevated)]">
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

                    <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-teal-500/10 to-cyan-500/5 border border-teal-500/20 hidden sm:block">
                        <p className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] mb-1 font-semibold">Attendance Monitor</p>
                        <div className="flex items-center justify-between">
                            <p className="text-lg font-bold text-teal-200">Live</p>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
