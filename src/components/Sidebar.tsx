"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
    LayoutDashboard,
    Search,
    Kanban,
    BarChart3,
    Settings,
    Briefcase,
    LogOut,
    HelpCircle,
    ShieldAlert,
    X,
    Layers,
    MessageCircle,
    ChevronDown,
    ChevronRight,
    Target,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { AstuteLogo } from "@/components/AstuteLogo";

interface NavItem {
    label: string;
    icon?: any;
    href?: string;
    children?: NavItem[];
}

const navItems: NavItem[] = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },

    {
        label: "Reddit",
        icon: MessageCircle,
        children: [
            { href: "/sources?source=reddit", label: "Scanner", icon: Search },
            { href: "/analytics?source=reddit", label: "Analytics", icon: BarChart3 },
        ]
    },

    {
        label: "Product Hunt",
        icon: Target,
        children: [
            { href: "/sources?source=producthunt", label: "Scanner", icon: Search },
            { href: "/analytics?source=producthunt", label: "Analytics", icon: BarChart3 },
        ]
    },

    {
        label: "IndieHustle",
        icon: Layers,
        children: [
            { href: "/sources?source=indiehustle", label: "Scanner", icon: Search },
            { href: "/analytics?source=indiehustle", label: "Analytics", icon: BarChart3 },
        ]
    },

    { href: "/deals", label: "Deals", icon: Briefcase },
    { href: "/pipeline", label: "Pipeline", icon: Kanban },
    { href: "/team-chat", label: "Team Chat", icon: MessageCircle },
    { href: "/support", label: "Support", icon: HelpCircle },
];

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

const SidebarItem = ({ item, level = 0, onClose, pathname }: { item: NavItem, level?: number, onClose?: () => void, pathname: string }) => {
    // Auto-expand if a child is active
    const isChildActive = (item: NavItem): boolean => {
        if (item.href === pathname) return true;
        if (item.children) return item.children.some(child => isChildActive(child));
        return false;
    };

    const [isExpanded, setIsExpanded] = useState(level < 2 || isChildActive(item)); // Default open top levels

    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const searchParams = useSearchParams();
    const currentPlatform = searchParams.get("source") || "reddit";

    // Check if this item is for a specific platform
    const itemPlatform = item.href?.includes("source=producthunt")
        ? "producthunt"
        : item.href?.includes("source=indiehustle")
            ? "indiehustle"
            : "reddit";

    // Modify isActive check
    const isActive = item.href?.split("?")[0] === pathname && itemPlatform === currentPlatform;

    // Indentation based on level
    const paddingLeft = level === 0 ? '1rem' : `${level * 1 + 1}rem`;

    if (hasChildren) {
        return (
            <div className="mb-1">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`w-full flex items-center justify-between py-3 pr-4 rounded-lg transition-all duration-150 text-[var(--text-muted)] hover:bg-[var(--card-hover)] hover:text-white`}
                    style={{ paddingLeft }}
                >
                    <div className="flex items-center gap-3">
                        {Icon && <Icon className="w-5 h-5" />}
                        <span className="font-medium">{item.label}</span>
                    </div>
                    {isExpanded ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
                </button>

                {isExpanded && (
                    <div className="mt-1 space-y-1">
                        {item.children!.map((child, index) => (
                            <SidebarItem
                                key={index}
                                item={child}
                                level={level + 1}
                                onClose={onClose}
                                pathname={pathname}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <Link
            href={item.href!}
            onClick={onClose}
            className={`flex items-center gap-3 py-3 pr-4 rounded-lg transition-all duration-150 mb-1 ${isActive
                ? "bg-gradient-to-r from-cyan-500/10 to-cyan-600/5 text-cyan-400 border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                : "text-[var(--text-muted)] hover:bg-[var(--card-hover)] hover:text-white"
                }`}
            style={{ paddingLeft }}
        >
            {Icon && <Icon className="w-5 h-5" />}
            <span className="font-medium">{item.label}</span>
        </Link>
    );
};

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
                <div className="relative p-6 border-b border-[var(--border)]">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5" />
                    <div className="relative flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-3 group" onClick={onClose}>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                <AstuteLogo className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-lg text-white leading-tight group-hover:text-cyan-400 transition-colors">Astute</h1>
                                <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">Intelligence</p>
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

                {/* Navigation */}
                <nav className="flex-1 py-6 px-3 overflow-y-auto">
                    {navItems.map((item, index) => (
                        <SidebarItem
                            key={index}
                            item={item}
                            onClose={onClose}
                            pathname={pathname}
                        />
                    ))}

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
