"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Zap, Lock, User, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await signIn("credentials", {
                username,
                password,
                redirect: false,
            });

            if (result?.error) {
                toast.error("Invalid credentials. Access denied.");
            } else {
                toast.success("Welcome back, Team!");
                router.push("/");
                router.refresh();
            }
        } catch (error) {
            toast.error("An error occurred during sign in.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-1/4 -left-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-purple-500/10 rounded-full blur-[120px]" />

            <div className="w-full max-w-md z-10">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 shadow-lg">
                            <img src="/logo.jpg" alt="Alley & Street" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-sm font-semibold text-white/60 tracking-[0.2em] uppercase">Alley & Street</span>
                    </div>

                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 mb-4 shadow-lg shadow-cyan-500/20">
                        <Zap className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Astute Portal</h1>
                    <p className="text-[var(--text-dim)]">Internal access for authenticated team members</p>
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-muted)] mb-2 px-1">
                                Team ID
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)]">
                                    <User className="w-4 h-4" />
                                </span>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                                    placeholder="Enter your team ID"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-muted)] mb-2 px-1">
                                Password
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)]">
                                    <Lock className="w-4 h-4" />
                                </span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Access Portal
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-[var(--border)] text-center">
                        <p className="text-xs text-[var(--text-dim)] flex items-center justify-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                            Secure End-to-End Encryption Enabled
                        </p>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-xs text-[var(--text-muted)]">
                        &copy; 2026 Alley & Street. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
