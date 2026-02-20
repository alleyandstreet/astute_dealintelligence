"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    BarChart3,
    Settings,
    LogOut,
    X,
    Layers,
    ChevronDown,
    ChevronRight,
    LineChart,
    History,
    FileText
} from "lucide-react";
import { signOut } from "next-auth/react";
import { AstuteLogo } from "@/components/AstuteLogo";

interface NavItem {
    label: string;
    icon?: any;
    href?: string;
    children?: NavItem[];
}

const navItems: NavItem[] = [
    { href: "/", label: "Hub", icon: Layers },
    // { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }, // Optional: Link back to main dashboard
    { href: "/market-intelligence", label: "Analysis", icon: BarChart3 },
    { href: "/market-intelligence/reports", label: "Saved Reports", icon: FileText },
    { href: "/market-intelligence/history", label: "History", icon: History },
    { href: "/market-intelligence/trends", label: "Trend Watch", icon: LineChart },
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

    const [isExpanded, setIsExpanded] = useState(level < 2 || isChildActive(item));

    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;

    // Indentation based on level
    const paddingLeft = level === 0 ? '1rem' : `${level * 1 + 1}rem`;
    const isActive = item.href === pathname;

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
                ? "bg-gradient-to-r from-purple-500/10 to-pink-600/5 text-purple-400 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                : "text-[var(--text-muted)] hover:bg-[var(--card-hover)] hover:text-white"
                }`}
            style={{ paddingLeft }}
        >
            {Icon && <Icon className="w-5 h-5" />}
            <span className="font-medium">{item.label}</span>
        </Link>
    );
};

export default function MarketIntelligenceSidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();

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
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5" />
                    <div className="relative flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-3 group" onClick={onClose}>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                <AstuteLogo className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-lg text-white leading-tight group-hover:text-purple-400 transition-colors">Astute</h1>
                                <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">Market Intel</p>
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
                </div>
            </aside>
        </>
    );
}
