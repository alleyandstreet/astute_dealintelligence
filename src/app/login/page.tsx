"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { AstuteLogo } from "@/components/AstuteLogo";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [isAnimating, setIsAnimating] = useState(true); // New state for animation
    const router = useRouter();

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsAnimating(false);
        }, 4000); // Duration of the initial animation
        return () => clearTimeout(timer);
    }, []);

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
                setLoading(false);
            } else {
                // Trigger the exit/entrance animation
                setIsAnimating(true);

                // Wait for animation to complete before redirecting
                setTimeout(() => {
                    toast.success("Welcome back, Team!");
                    router.push("/");
                    router.refresh();
                }, 4000);
            }
        } catch (error) {
            toast.error("An error occurred during sign in.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-cyan-500/30">
            <AnimatePresence>
                {isAnimating && (
                    <motion.div
                        key="initial-animation"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 1, delay: 0.5 } }}
                        className="absolute inset-0 z-50 bg-[#050505] flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1 }}
                            className="relative z-10 flex flex-col items-center"
                        >
                            <div className="mb-8 scale-[2]">
                                <AstuteLogo className="w-20 h-20 text-white" animate={true} />
                            </div>

                            <div className="flex flex-col items-center">
                                <motion.div
                                    className="flex items-center gap-1 overflow-hidden h-16"
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: "auto", opacity: 1 }}
                                    transition={{ delay: 1.5, duration: 1.2, ease: "easeOut" }}
                                >
                                    <span className="text-6xl font-bold text-white tracking-tight">Astute</span>
                                </motion.div>

                                <motion.span
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 2.8, duration: 0.5 }}
                                    className="text-sm font-medium text-white/40 tracking-[0.3em] uppercase mt-2"
                                >
                                    Intelligence
                                </motion.span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ambient Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[150px] animate-pulse-slow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[150px] animate-pulse-slow delay-1000" />
                <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-cyan-500/5 rounded-full blur-[100px]" />
                {/* Noise Texture */}
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={`w-full max-w-md z-10 relative ${isAnimating ? 'opacity-0 transition-opacity duration-1000' : ''}`}
            >
                <div className="text-center mb-10">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="flex flex-col items-center justify-center gap-4 mb-10"
                    >
                        <div className="relative group cursor-default">
                            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                            <div className="w-16 h-16 relative rounded-2xl bg-gradient-to-br from-[#09090b] to-[#121214] border border-white/10 shadow-2xl flex items-center justify-center">
                                <AstuteLogo className="w-10 h-10 text-white" />
                            </div>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-3xl font-bold text-white tracking-tight leading-none">Astute</span>
                            <span className="text-xs font-medium text-white/40 tracking-[0.3em] uppercase leading-none mt-1.5">Intelligence</span>
                        </div>
                    </motion.div>

                    <h1 className="text-4xl font-bold text-white mb-3 tracking-tight drop-shadow-lg">
                        Welcome Back
                    </h1>
                    <p className="text-[var(--text-dim)] text-base font-light">
                        Authenticate to access the <span className="text-cyan-400/80 font-medium">Astute Portal</span>
                    </p>
                </div>

                <div className="bg-[#121214]/60 backdrop-blur-2xl border border-white/5 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                    {/* Subtle shimmer card effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                    <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider ml-1">
                                Team ID
                            </label>
                            <div className="relative group/input">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within/input:text-cyan-400 transition-colors">
                                    <User className="w-4 h-4" />
                                </span>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-[#050505]/50 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all hover:bg-[#050505]/70"
                                    placeholder="Enter your ID"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider ml-1">
                                Password
                            </label>
                            <div className="relative group/input">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within/input:text-cyan-400 transition-colors">
                                    <Lock className="w-4 h-4" />
                                </span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#050505]/50 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all hover:bg-[#050505]/70"
                                    placeholder="Security key"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 group/btn mt-2 relative overflow-hidden"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span className="relative z-10">Access Portal</span>
                                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform relative z-10" />
                                </>
                            )}
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 pointer-events-none" />
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <p className="text-[10px] text-[var(--text-dim)] flex items-center justify-center gap-2 opacity-60">
                            <Lock className="w-3 h-3" />
                            End-to-End Encrypted Session
                        </p>
                    </div>
                </div>

                <div className="mt-8 flex flex-col items-center gap-4">
                    <p className="text-xs text-[var(--text-muted)] opacity-30 font-mono">
                        v2.0 • Astute Intelligence Systems
                    </p>
                    <div className="flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity duration-300">
                        <div className="w-6 h-6 rounded-md overflow-hidden border border-white/10">
                            <img src="/brand-logo.jpg" alt="Alley & Street" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">Alley & Street</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
