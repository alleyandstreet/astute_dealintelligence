"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Calendar,
    LogOut,
    X,
    ChevronDown,
    ChevronRight,
    Sparkles,
    Megaphone,
    Image as ImageIcon,
    Film
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
    { href: "/marketing", label: "Generator", icon: Sparkles },
    { href: "/marketing/hooks", label: "Hook Lab", icon: Sparkles },
    { href: "/calendar", label: "Calendar", icon: Calendar },
];

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

const SidebarItem = ({ item, level = 0, onClose, pathname }: { item: NavItem, level?: number, onClose?: () => void, pathname: string }) => {
    const isChildActive = (item: NavItem): boolean => {
        if (item.href === pathname) return true;
        if (item.children) return item.children.some(child => isChildActive(child));
        return false;
    };

    const [isExpanded, setIsExpanded] = useState(level < 2 || isChildActive(item));

    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isActive = item.href === pathname;

    const paddingLeft = level === 0 ? '1rem' : `${level * 1 + 1}rem`;

    if (hasChildren) {
        return (
            <div className="mb-1">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`w-full flex items-center justify-between py-3 pr-4 rounded-lg transition-all duration-150 text-zinc-400 hover:bg-white/5 hover:text-white`}
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
                ? "bg-gradient-to-r from-pink-600/20 to-pink-500/10 text-pink-400 border border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.15)]"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
            style={{ paddingLeft }}
        >
            {Icon && <Icon className="w-5 h-5" />}
            <span className="font-medium">{item.label}</span>
        </Link>
    );
};

export default function ContentSidebar({ isOpen, onClose }: SidebarProps) {
    const { data: session } = useSession();
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

            <aside className={`fixed left-0 top-0 h-screen w-64 bg-[#050505] border-r border-white/10 flex flex-col z-[70] transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Logo & Close Button */}
                <div className="relative p-6 border-b border-white/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-900/10 to-purple-900/10" />
                    <div className="relative flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-3 group" onClick={onClose}>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-600 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                <Megaphone className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-lg text-white leading-tight group-hover:text-pink-400 transition-colors">Astute</h1>
                                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Content Engine</p>
                            </div>
                        </Link>
                        <button
                            onClick={onClose}
                            className="lg:hidden p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-6 px-3 overflow-y-auto">
                    <p className="px-4 text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-4">Platform</p>
                    {navItems.map((item, index) => (
                        <SidebarItem
                            key={index}
                            item={item}
                            onClose={onClose}
                            pathname={pathname}
                        />
                    ))}

                    <div className="my-6 border-t border-white/5 mx-4" />

                    <Link
                        href="/"
                        className="flex items-center gap-3 py-3 px-4 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        <span className="font-medium">Go to Hub</span>
                    </Link>
                </nav>

                {/* Bottom section */}
                <div className="p-4 border-t border-white/10 bg-[#0a0a0a]">
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
