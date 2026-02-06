import { InvestmentMemo } from "@/lib/services/deep-analysis";
import {
    TrendingUp,
    AlertTriangle,
    ShieldCheck,
    Target,
    CheckCircle2,
    XCircle
} from "lucide-react";

interface InvestmentMemoViewProps {
    memo: InvestmentMemo;
}

export function InvestmentMemoView({ memo }: InvestmentMemoViewProps) {
    const getRiskColor = (score: number) => {
        if (score >= 8) return "text-red-400";
        if (score >= 5) return "text-amber-400";
        return "text-emerald-400";
    };

    const formattedPrice = memo.strategic_recommendation.suggested_offer_range || "N/A";

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Executive Summary */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <Target className="w-5 h-5 text-cyan-400" />
                    Executive Summary
                </h3>
                <p className="text-zinc-300 leading-relaxed text-sm">
                    {memo.executive_summary}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Market Analysis */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                    <div className="flex items-center gap-2 text-purple-400 mb-2">
                        <TrendingUp className="w-5 h-5" />
                        <h4 className="font-bold text-white">Market Analysis</h4>
                    </div>

                    <div>
                        <span className="text-xs uppercase tracking-wider text-zinc-500 block mb-1">TAM / SAM / SOM</span>
                        <p className="text-sm text-zinc-300">{memo.market_analysis.tam_sam_som}</p>
                    </div>

                    <div>
                        <span className="text-xs uppercase tracking-wider text-zinc-500 block mb-1">Competitors</span>
                        <div className="flex flex-wrap gap-2">
                            {memo.market_analysis.competitors.map((comp, i) => (
                                <span key={i} className="px-2 py-1 bg-white/5 rounded text-xs text-zinc-400 border border-white/5">
                                    {comp}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Risk Assessment */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-amber-400">
                            <AlertTriangle className="w-5 h-5" />
                            <h4 className="font-bold text-white">Risk Profile</h4>
                        </div>
                        <span className={`text-xl font-bold font-mono ${getRiskColor(memo.risk_assessment.overall_risk_score)}`}>
                            {memo.risk_assessment.overall_risk_score}/10
                        </span>
                    </div>

                    <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="p-2 bg-black/20 rounded border border-white/5">
                                <span className="text-zinc-500 block">Tech</span>
                                <span className="text-zinc-300 font-medium">{memo.risk_assessment.technical_risk.split(' ')[0]}</span>
                            </div>
                            <div className="p-2 bg-black/20 rounded border border-white/5">
                                <span className="text-zinc-500 block">Market</span>
                                <span className="text-zinc-300 font-medium">{memo.risk_assessment.market_risk.split(' ')[0]}</span>
                            </div>
                            <div className="p-2 bg-black/20 rounded border border-white/5">
                                <span className="text-zinc-500 block">Execution</span>
                                <span className="text-zinc-300 font-medium">{memo.risk_assessment.execution_risk.split(' ')[0]}</span>
                            </div>
                        </div>
                        <p className="text-xs text-zinc-400 italic">
                            {memo.risk_assessment.execution_risk}
                        </p>
                    </div>
                </div>
            </div>

            {/* SWOT Analysis */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h4 className="font-bold text-white mb-4">SWOT Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <h5 className="text-xs text-emerald-400 uppercase tracking-wider font-bold">Strengths</h5>
                        <ul className="space-y-1">
                            {memo.swot_analysis.strengths.map((s, i) => (
                                <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500/50 mt-0.5 shrink-0" />
                                    {s}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="space-y-2">
                        <h5 className="text-xs text-red-400 uppercase tracking-wider font-bold">Weaknesses</h5>
                        <ul className="space-y-1">
                            {memo.swot_analysis.weaknesses.map((w, i) => (
                                <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                                    <XCircle className="w-4 h-4 text-red-500/50 mt-0.5 shrink-0" />
                                    {w}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Strategic Recommendation */}
            <div className={`rounded-xl p-6 border ${memo.strategic_recommendation.action === "ACQUIRE" ? "bg-emerald-500/10 border-emerald-500/20" :
                    memo.strategic_recommendation.action === "WATCH" ? "bg-amber-500/10 border-amber-500/20" :
                        "bg-red-500/10 border-red-500/20"
                }`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className={`w-6 h-6 ${memo.strategic_recommendation.action === "ACQUIRE" ? "text-emerald-400" :
                                memo.strategic_recommendation.action === "WATCH" ? "text-amber-400" : "text-red-400"
                            }`} />
                        <h3 className="text-xl font-bold text-white">Strategic Verdict</h3>
                    </div>
                    <span className={`px-4 py-1 rounded-full text-sm font-bold border ${memo.strategic_recommendation.action === "ACQUIRE" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                            memo.strategic_recommendation.action === "WATCH" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                                "bg-red-500/20 text-red-400 border-red-500/30"
                        }`}>
                        {memo.strategic_recommendation.action}
                    </span>
                </div>

                <p className="text-zinc-300 text-sm mb-4">
                    {memo.strategic_recommendation.reasoning}
                </p>

                <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-2">
                    <span className="text-xs text-zinc-500 uppercase tracking-wider">Suggested Offer Range</span>
                    <span className="font-mono text-white font-bold">{formattedPrice}</span>
                </div>
            </div>

        </div>
    );
}
