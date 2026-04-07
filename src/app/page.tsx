"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Search,
  BarChart3,
  Settings,
  Zap,
  Globe,
  ArrowRight,
  Users
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import type { HubFeatureKey } from "@/lib/feature-access";

const modules = [
  {
    title: "Deal Sourcing",
    description: "AI-Powered Opportunity Scanner",
    icon: Search,
    href: "/dashboard",
    featureKey: "deal_sourcing" as HubFeatureKey,
    color: "emerald",
    status: "active",
    gradient: "from-emerald-400 to-sky-500"
  },
  {
    title: "Market Intelligence",
    description: "Deep Market Trends & Analysis",
    icon: BarChart3,
    href: "/market-intelligence",
    featureKey: "market_intelligence" as HubFeatureKey,
    color: "sky",
    status: "active",
    gradient: "from-sky-400 to-cyan-500"
  },
  {
    title: "Content Engine",
    description: "From idea to caption to publishing, one stop",
    icon: Globe,
    href: "/marketing",
    featureKey: "content_engine" as HubFeatureKey,
    color: "amber",
    status: "active",
    gradient: "from-amber-400 to-orange-500"
  },
  {
    title: "Team CRM",
    description: "Ownership, tasks, and follow-up command center",
    icon: Users,
    href: "/crm",
    featureKey: "team_crm" as HubFeatureKey,
    color: "teal",
    status: "active",
    gradient: "from-teal-400 to-cyan-500"
  },

  {
    title: "Admin Control",
    description: "System Configuration",
    icon: Settings,
    href: "/admin",
    featureKey: "admin_control" as HubFeatureKey,
    color: "slate",
    status: "restricted",
    gradient: "from-slate-500 to-slate-700"
  }
];

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AccessProfile = {
  features?: Record<HubFeatureKey, boolean>;
};
type SessionUser = { role?: string };

export default function HubPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [featureAccess, setFeatureAccess] = useState<Record<HubFeatureKey, boolean> | null | undefined>(undefined);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    let active = true;

    fetch("/api/access/me")
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load access profile");
        return response.json();
      })
      .then((payload: AccessProfile) => {
        if (!active) return;
        setFeatureAccess(payload.features || null);
      })
      .catch((error) => {
        console.error(error);
        if (!active) return;
        setFeatureAccess(null);
      });

    return () => {
      active = false;
    };
  }, [status]);

  const isAdmin = (session?.user as SessionUser | undefined)?.role === "super_admin";

  if (status === "loading" || (status === "authenticated" && featureAccess === undefined)) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#050505]">

      {/* Background Ambient Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-400/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-sky-400/10 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[40%] h-[40%] bg-amber-400/5 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="z-10 text-center mb-12 space-y-6"
      >
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-sky-500 rounded-2xl blur opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
            <div className="relative w-16 h-16 rounded-2xl bg-black border border-white/10 flex items-center justify-center backdrop-blur-xl shadow-2xl">
              <Zap className="w-8 h-8 text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white">
              Astute <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-sky-400 to-amber-300 animate-gradient-x">Intelligence</span>
            </h1>
            <p className="text-zinc-500 text-sm font-mono tracking-widest uppercase">
              System Operational • v4.0.0
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl z-10 px-6">
        {modules.map((module) => {
          const Icon = module.icon;
          const canAccess = featureAccess
            ? Boolean(featureAccess[module.featureKey])
            : (module.featureKey === "admin_control" ? isAdmin : true);
          const isLocked = !canAccess;

          return (
            <Link
              key={module.title}
              href={canAccess ? module.href : "#"}
              className={`block ${isLocked ? 'cursor-not-allowed opacity-60' : ''} group perspective-1000`}
              onClick={(event) => {
                if (!canAccess) {
                  event.preventDefault();
                }
              }}
            >
              <GlassCard
                className="h-full p-6 relative overflow-hidden border-white/5 hover:border-white/20 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] bg-black/40 backdrop-blur-md"
                intensity="low"
              >
                {/* Content */}
                <div className="relative z-10 flex items-center gap-5">
                  <div className={`
                    w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0
                    bg-gradient-to-br from-white/5 to-white/0 border border-white/10
                    group-hover:border-${module.color}-500/30 group-hover:bg-${module.color}-500/10
                    transition-all duration-300
                  `}>
                    <Icon className={`w-6 h-6 text-zinc-400 group-hover:text-${module.color}-400 transition-colors duration-300`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-50 transition-colors truncate">
                      {module.title}
                    </h3>
                    <p className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors truncate">
                      {module.description}
                    </p>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex-shrink-0">
                    {isLocked ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 px-2 py-1 rounded-md border border-zinc-700">
                        Restricted
                      </span>
                    ) : (
                      <ArrowRight className={`w-4 h-4 text-zinc-600 group-hover:text-${module.color}-400 group-hover:translate-x-1 transition-all`} />
                    )}
                  </div>
                </div>

                {/* Hover Glow */}
                <div className={`absolute inset-0 bg-gradient-to-r ${module.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
              </GlassCard>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
