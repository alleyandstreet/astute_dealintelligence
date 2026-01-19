"use client";

import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { HelpCircle, BookOpen, Lightbulb, ChevronDown, ChevronUp, MessageSquare, Send, Bot, User } from "lucide-react";

const FAQS = [
    {
        question: "How does the deal scanner work?",
        answer: "Our engine scans specified subreddits Every 15 minutes (or on-demand) looking for specific commercial signals like 'revenue', 'EBIDTA', and 'for sale'. It then uses our internal scoring algorithm to rank the viability of the deal."
    },
    {
        question: "Can I reset a team member's password?",
        answer: "Yes. From the User Management page, click 'Edit' on any user profile. You can directly override their password and ID, ensuring absolute backend control."
    },
    {
        question: "How is the Viability Score calculated?",
        answer: "It weighs several factors: verified revenue (30%), recurring nature (SaaS/Subscription) (20%), profitability (20%), and business age (15%). A score above 70 is flagged as a high-intent opportunity."
    },
    {
        question: "Can I own multiple businesses on this platform?",
        answer: "Absolutely. The Global Business Directory tracks all assets associated with your account, including valuation and revenue metrics for each entity."
    }
];

const TIPS = [
    { title: "Aggressive Search", desc: "Add 'urgent' or 'fire sale' to your Scanner Config keywords to find motivated sellers faster.", icon: Zap },
    { title: "Dashboard Telemetry", desc: "Monitor 'System Events' to see real-time activity when your scanner identifies a potential unicorn.", icon: Lightbulb },
    { title: "Forensics", desc: "Use the Activity Logs to audit exactly what your team has modified in the deal pipeline.", icon: ShieldCheck }
];

import { ShieldCheck, Zap } from "lucide-react";

export default function SupportPage() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [messages, setMessages] = useState([
        { role: "bot", text: "Welcome to the Executive Terminal. I have access to the User and Business databases. How can I assist you today?" }
    ]);
    const [input, setInput] = useState("");

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const newMessages = [...messages, { role: "user", text: input }];
        setMessages(newMessages);
        setInput("");

        // Simulated AI Chatbot logic - in a real app, this would call an API
        setTimeout(() => {
            let botResponse = "I've analyzed the secure database. ";
            if (input.toLowerCase().includes("user")) {
                botResponse += "I found several active administrative nodes. You have full override authority in the User Management console.";
            } else if (input.toLowerCase().includes("deal")) {
                botResponse += "The deal pipeline is currently active. Our latest scan identified 3 new high-viability leads.";
            } else {
                botResponse += "That query is within my intelligence range, but for specific data mutations, please use the Super Admin overrides.";
            }
            setMessages([...newMessages, { role: "bot", text: botResponse }]);
        }, 800);
    };

    return (
        <AdminLayout>
            <div className="max-w-6xl mx-auto py-10 px-4">
                <div className="mb-12">
                    <h1 className="text-4xl font-black text-white mb-2">Knowledge Base & Intelligence</h1>
                    <p className="text-slate-400">Executive documentation and real-time database assistance.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-12">
                        {/* FAQ Section */}
                        <section>
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <HelpCircle className="text-cyan-400" size={24} />
                                System FAQs
                            </h2>
                            <div className="space-y-4">
                                {FAQS.map((faq, i) => (
                                    <div key={i} className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
                                        <button
                                            onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                            className="w-full p-5 flex justify-between items-center text-left hover:bg-slate-800/50 transition-all font-bold text-white"
                                        >
                                            {faq.question}
                                            {openFaq === i ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </button>
                                        {openFaq === i && (
                                            <div className="p-5 pt-0 text-slate-400 text-sm leading-relaxed border-t border-slate-700/30 bg-slate-900/40">
                                                {faq.answer}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Tips & Tricks */}
                        <section>
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Lightbulb className="text-yellow-400" size={24} />
                                Master Tips & Tricks
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {TIPS.map((tip, i) => (
                                    <div key={i} className="p-6 bg-slate-900/50 border border-slate-700/50 rounded-2xl group hover:border-yellow-500/30 transition-all">
                                        <div className="p-3 bg-yellow-500/10 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                                            <tip.icon className="text-yellow-400" size={24} />
                                        </div>
                                        <h3 className="text-white font-bold mb-2">{tip.title}</h3>
                                        <p className="text-slate-500 text-xs leading-relaxed">{tip.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Mini Chatbot Side Panel */}
                    <div className="relative">
                        <div className="sticky top-24 bg-slate-900 border border-slate-700/50 rounded-3xl h-[600px] flex flex-col shadow-2xl">
                            <div className="p-5 border-b border-slate-700/50 flex items-center gap-3">
                                <div className="p-2 bg-cyan-500/20 rounded-lg">
                                    <Bot className="text-cyan-400" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-sm">Astute Intel Bot</h3>
                                    <p className="text-[10px] text-green-500 font-mono">DATABASE_LOCAL_CONN: ACTIVE</p>
                                </div>
                            </div>

                            <div className="flex-1 p-5 overflow-y-auto space-y-4 font-mono text-xs">
                                {messages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700/50'}`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700/50">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Ask about users/deals..."
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-12 py-3 text-white text-xs focus:outline-none focus:border-cyan-500 transition-all"
                                    />
                                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-cyan-500 hover:text-white transition-colors">
                                        <Send size={16} />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
