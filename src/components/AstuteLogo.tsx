import React from "react";

interface AstuteLogoProps {
    className?: string; // For sizing/coloring
    animate?: boolean; // If true, applies the drawing animation
}

export const AstuteLogo = ({ className = "w-10 h-10", animate = false }: AstuteLogoProps) => {
    return (
        <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* 
               Zap/Thunderbolt shape (reverting to "thunder like thing"):
               Matches Lucide Zap icon style but as a drawing path
            */}
            <path
                d="M55 10 L15 55 L50 55 L45 90 L85 45 L50 45 L55 10 Z"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={animate ? "animate-draw-path" : ""}
                style={animate ? { strokeDasharray: 400, strokeDashoffset: 400, animation: "draw 2s ease-out forwards" } : {}}
            />
            <style jsx>{`
                @keyframes draw {
                    to {
                        stroke-dashoffset: 0;
                    }
                }
            `}</style>
        </svg>
    );
};
