"use client";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    TooltipProps,
} from "recharts";
import { format } from "date-fns";
import { Deal } from "@/types";

interface DealTrendChartProps {
    deals: Deal[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        // label is now the timestamp (number)
        const dateLabel = format(new Date(label), "MMM d, h:mm a");

        return (
            <div className="bg-zinc-900/90 border border-white/10 p-4 rounded-xl backdrop-blur-md shadow-2xl">
                <p className="text-zinc-400 text-xs mb-1">{dateLabel}</p>
                <p className="text-cyan-400 font-bold text-lg">
                    {payload[0].value}% <span className="text-xs font-normal text-zinc-500">Viability</span>
                </p>
                <p className="text-emerald-400 font-medium text-sm mt-1">
                    {payload[0].payload.name}
                </p>
            </div>
        );
    }
    return null;
};

export function DealTrendChart({ deals }: DealTrendChartProps) {
    // Transform deals into chart data
    const data = deals
        .filter((d) => d.createdAt && d.viabilityScore)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((deal) => ({
            name: deal.name,
            timestamp: new Date(deal.createdAt).getTime(), // Use unique timestamp
            score: deal.viabilityScore || 0,
        }));

    // If no data, show a placeholder or empty state
    if (data.length === 0) {
        return (
            <div className="h-[300px] w-full flex items-center justify-center text-zinc-500">
                No trend data available yet.
            </div>
        );
    }

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{
                        top: 10,
                        right: 30,
                        left: 0,
                        bottom: 0,
                    }}
                >
                    <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#27272a"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="timestamp"
                        stroke="#71717a"
                        tick={{ fill: "#71717a", fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => format(new Date(value), "MMM d")}
                        minTickGap={30}
                    />
                    <YAxis
                        stroke="#71717a"
                        tick={{ fill: "#71717a", fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 100]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#06b6d4"
                        fillOpacity={1}
                        fill="url(#colorScore)"
                        strokeWidth={3}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
