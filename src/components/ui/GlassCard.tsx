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
        low: "bg-[color:rgba(20,26,31,0.55)] border-[color:rgba(47,58,67,0.6)] backdrop-blur-md",
        medium: "bg-[color:rgba(20,26,31,0.75)] border-[color:rgba(47,58,67,0.8)] backdrop-blur-lg",
        high: "bg-[color:rgba(16,22,26,0.9)] border-[color:rgba(47,58,67,0.9)] backdrop-blur-xl",
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
                "rounded-2xl border transition-all duration-300 shadow-[0_12px_30px_rgba(0,0,0,0.3)]",
                intensityMap[intensity],
                hoverEffect && "hover:border-[color:rgba(45,212,191,0.35)] hover:shadow-[0_18px_40px_rgba(0,0,0,0.45)]",
                className
            )}
        >
            {children}
        </motion.div>
    );
}
