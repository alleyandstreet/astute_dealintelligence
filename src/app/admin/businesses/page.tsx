"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AdminLayout from "@/components/AdminLayout";
import { Building2, User, Search, Briefcase } from "lucide-react";
import { toast } from "sonner";

interface Business {
    id: string;
    name: string;
    description: string;
    industry: string;
    valuation: number;
    revenue: number;
    status: string;
    createdAt: string;
    owner: {
        username: string;
        email: string;
    };
}

export default function AdminBusinessesPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated" && (session?.user as any)?.role !== "super_admin") {
            router.push("/");
        }
    }, [status, session, router]);

    useEffect(() => {
        if ((session?.user as any)?.role === "super_admin") {
            fetchBusinesses();
        }
    }, [session]);

    const fetchBusinesses = async () => {
        try {
            const res = await fetch("/api/admin/businesses");
            if (res.ok) {
                const data = await res.json();
                setBusinesses(data.businesses);
            }
        } catch (error) {
            console.error("Error fetching businesses:", error);
            toast.error("Failed to fetch businesses");
        } finally {
            setLoading(false);
        }
    };

    const filteredBusinesses = businesses.filter(b =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.owner.username.toLowerCase().includes(search.toLowerCase())
    );

    if (status === "loading" || loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-white animate-pulse">Accessing Secure Records...</div>
            </div>
        );
    }

    return (
        <AdminLayout>
            <div className="max-w-6xl">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Global Business Directory</h1>
                        <p className="text-slate-400">Master database of all user-owned entities</p>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Filter by business or owner..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-cyan-500 w-64"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {filteredBusinesses.length > 0 ? (
                        filteredBusinesses.map((business) => (
                            <div key={business.id} className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-xl p-6 hover:bg-slate-800/60 transition-all group">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-4">
                                        <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 group-hover:scale-110 transition-transform">
                                            <Building2 size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-1">{business.name}</h3>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="flex items-center gap-1 text-slate-400">
                                                    <User size={14} className="text-cyan-500" />
                                                    Owner: <span className="text-white font-medium">{business.owner.username}</span>
                                                </span>
                                                <span className="flex items-center gap-1 text-slate-400">
                                                    <Briefcase size={14} className="text-purple-500" />
                                                    Industry: <span className="text-white font-medium">{business.industry || "N/A"}</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Valuation</div>
                                        <div className="text-cyan-400 font-mono text-xl font-bold">
                                            {business.valuation ? `$${business.valuation.toLocaleString()}` : "—"}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-700/30 grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">Revenue</p>
                                        <p className="text-white font-mono text-sm">
                                            {business.revenue ? `$${business.revenue.toLocaleString()}` : "Undisclosed"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">Status</p>
                                        <p className="text-green-400 font-mono text-sm capitalize">{business.status}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">Registered</p>
                                        <p className="text-slate-400 font-mono text-sm">
                                            {new Date(business.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex justify-end items-end">
                                        <button className="text-[10px] px-3 py-1 bg-slate-900 border border-slate-700 rounded-full text-slate-400 hover:text-white hover:border-cyan-500 transition-all uppercase font-bold">View Ledger</button>
                                    </div>
                                </div>
                                {business.description && (
                                    <p className="mt-3 text-sm text-slate-400 italic">"{business.description}"</p>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 bg-slate-800/20 border border-dashed border-slate-700 rounded-xl">
                            <Building2 size={48} className="mx-auto text-slate-700 mb-4" />
                            <p className="text-slate-500">No businesses found in the database.</p>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
