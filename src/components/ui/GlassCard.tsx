"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { HTMLMotionProps, motion } from "framer-motion";

interface GlassCardProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
    intensity?: "low" | "medium" | "high";
}

export function GlassCard({
    children,
    className,
    hoverEffect = false,
    intensity = "medium",
    ...props
}: GlassCardProps) {
    const intensityMap = {
        low: "bg-white/5 border-white/5 backdrop-blur-md",
        medium: "bg-zinc-900/60 border-white/10 backdrop-blur-lg",
        high: "bg-zinc-900/80 border-white/10 backdrop-blur-xl",
    };

    return (
        <motion.div
            {...props}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            whileHover={
                hoverEffect
                    ? {
                        y: -5,
                        boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.5)",
                    }
                    : {}
            }
            className={cn(
                "rounded-2xl border transition-all duration-300",
                intensityMap[intensity],
                hoverEffect && "hover:border-white/20 hover:bg-zinc-800/60",
                className
            )}
        >
            {children}
        </motion.div>
    );
}
