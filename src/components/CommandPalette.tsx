"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
    Search,
    LayoutDashboard,
    Settings,
    User,
    Zap,
    LogOut,
    Moon,
    Sun,
    Laptop,
    PenTool
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function CommandPalette() {
    const [open, setOpen] = React.useState(false);
    const router = useRouter();

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false);
        command();
    }, []);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="fixed bottom-6 right-24 z-50 w-12 h-12 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 shadow-lg flex items-center justify-center hover:bg-zinc-700 hover:text-white hover:scale-110 transition-all duration-300 group"
                aria-label="Open Command Menu"
            >
                <div className="flex flex-col items-center">
                    <div className="w-5 h-5 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
                        </svg>
                    </div>
                </div>
            </button>

            <AnimatePresence>
                {open && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                        />

                        {/* Dialog */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="w-full max-w-xl relative"
                        >
                            <Command
                                filter={(value, search) => {
                                    if (value.includes(search.toLowerCase())) return 1;
                                    return 0;
                                }}
                                className="w-full bg-[#121214] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                            >
                                <div className="flex items-center border-b border-white/5 px-4">
                                    <Search className="w-5 h-5 text-zinc-500 mr-3" />
                                    <Command.Input
                                        className="w-full bg-transparent py-4 text-base text-white placeholder:text-zinc-600 focus:outline-none"
                                        placeholder="Type a command or search..."
                                    />
                                </div>

                                <Command.List className="max-h-[300px] overflow-y-auto p-2 scroll-py-2">
                                    <Command.Empty className="py-6 text-center text-sm text-zinc-600">
                                        No results found.
                                    </Command.Empty>

                                    <Command.Group heading="Navigation" className="text-xs font-medium text-zinc-500 mb-2 px-2">
                                        <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
                                            <Zap className="w-4 h-4 mr-2" />
                                            Hub
                                        </CommandItem>
                                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
                                            <LayoutDashboard className="w-4 h-4 mr-2" />
                                            Dashboard
                                        </CommandItem>
                                        <CommandItem onSelect={() => runCommand(() => router.push("/marketing"))}>
                                            <PenTool className="w-4 h-4 mr-2" />
                                            Content Engine
                                        </CommandItem>
                                        <CommandItem onSelect={() => runCommand(() => router.push("/settings"))}>
                                            <Settings className="w-4 h-4 mr-2" />
                                            Settings
                                        </CommandItem>
                                    </Command.Group>

                                    <Command.Group heading="Deal Sourcing" className="text-xs font-medium text-zinc-500 mb-2 px-2">
                                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard?source=reddit"))}>
                                            <span className="w-4 h-4 mr-2 flex items-center justify-center text-[10px] font-bold bg-orange-500/20 text-orange-500 rounded-sm">R</span>
                                            Reddit Scanner
                                        </CommandItem>
                                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard?source=producthunt"))}>
                                            <span className="w-4 h-4 mr-2 flex items-center justify-center text-[10px] font-bold bg-orange-600/20 text-orange-600 rounded-sm">P</span>
                                            Product Hunt Scanner
                                        </CommandItem>
                                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard?source=indiehustle"))}>
                                            <span className="w-4 h-4 mr-2 flex items-center justify-center text-[10px] font-bold bg-pink-500/20 text-pink-500 rounded-sm">I</span>
                                            Indie Hustle Scanner
                                        </CommandItem>
                                    </Command.Group>

                                    <Command.Separator className="h-px bg-white/5 my-2" />

                                    <Command.Group heading="Theme" className="text-xs font-medium text-zinc-500 mb-2 px-2">
                                        <CommandItem onSelect={() => runCommand(() => { })}>
                                            <Laptop className="w-4 h-4 mr-2" />
                                            System
                                        </CommandItem>
                                        <CommandItem onSelect={() => runCommand(() => { })}>
                                            <Moon className="w-4 h-4 mr-2" />
                                            Dark
                                        </CommandItem>
                                    </Command.Group>

                                </Command.List>
                            </Command>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}

function CommandItem({ children, onSelect }: { children: React.ReactNode, onSelect: () => void }) {
    return (
        <Command.Item
            onSelect={onSelect}
            className="flex items-center px-4 py-3 text-sm text-zinc-300 rounded-lg cursor-pointer hover:bg-white/5 hover:text-white aria-selected:bg-white/10 aria-selected:text-white transition-colors"
        >
            {children}
        </Command.Item>
    );
}
