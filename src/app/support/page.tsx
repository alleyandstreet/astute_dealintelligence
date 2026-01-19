"use client";

import { useState } from "react";
import {
    HelpCircle,
    BookOpen,
    Lightbulb,
    ChevronDown,
    ChevronUp,
    MessageSquare,
    Send,
    Bot,
    Search,
    Kanban,
    Zap,
    Briefcase,
    TrendingUp
} from "lucide-react";

// Member-focused FAQs
const FAQS = [
    {
        question: "How do I find new deals?",
        answer: "Navigate to the 'Search' page. You can scan various subreddits for keywords related to business sales, such as 'MRR', 'selling', or 'SaaS'. The system uses AI to score and summarize these leads for you."
    },
    {
        question: "What is the Pipeline?",
        answer: "The Pipeline is a Kanban board where you can track your deal flow. Drag and drop deals from 'New Leads' to 'Researching', 'Contacted', or 'Closed' to stay organized."
    },
    {
        question: "How are Deal Scores calculated?",
        answer: "We analyze post content for financial metrics, seller motivation, and business stability. 'Viability' measures the health of the asset, while 'Motivation' tracks how ready the seller is to exit."
    },
    {
        question: "How do I add my own business data?",
        answer: "You can register your owned businesses in the settings or dedicated business section (if enabled) to track their valuation and performance relative to similar deals in the market."
    }
];

// Member-focused Tips
const TIPS = [
    { title: "Smart Filters", desc: "Use the Search filters to narrow down deals by industry or minimum revenue to find the best fit for your portfolio.", icon: Search },
    { title: "Kanban Strategy", desc: "Keep your Pipeline updated daily. Moving deals through stages helps you visualize conversion bottlenecks.", icon: Kanban },
    { title: "Scoring Insight", desc: "Don't just look at the high scores. Sometimes a lower 'Viability' score with a high 'Motivation' score is a better negotiation opportunity.", icon: TrendingUp }
];

export default function SupportPage() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [messages, setMessages] = useState([
        { role: "bot", text: "Hello! I'm your Astute Assistant. I can help you find deals, explain scoring, or guide you through the pipeline. What can I help you with?" }
    ]);
    const [input, setInput] = useState("");

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const newMessages = [...messages, { role: "user", text: input }];
        setMessages(newMessages);
        setInput("");

        // Simulated AI Chatbot logic for members
        setTimeout(() => {
            let botResponse = "";
            const query = input.toLowerCase();

            if (query.includes("deal") || query.includes("search")) {
                botResponse = "To find deals, head over to the Search tab. I recommend searching for 'SaaS' or 'E-commerce' to see the latest high-scoring leads.";
            } else if (query.includes("pipeline") || query.includes("kanban")) {
                botResponse = "The Pipeline helps you track progress. You can move deals through different stages by dragging them across the board.";
            } else if (query.includes("score")) {
                botResponse = "Scores are calculated based on seller intent and business financials. Look for deals with a Viability score > 70 for the most stable opportunities.";
            } else {
                botResponse = "I can definitely help with that. For the best experience, try checking our FAQ section or asking me about specific platform features like Search or the Pipeline.";
            }

            setMessages([...newMessages, { role: "bot", text: botResponse }]);
        }, 800);
    };

    return (
        <div className="max-w-6xl mx-auto py-10 px-4">
            <div className="mb-12">
                <h1 className="text-4xl font-bold text-white mb-2">Support & Intelligence</h1>
                <p className="text-[var(--text-dim)]">Everything you need to master the Astute platform.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-12">
                    {/* FAQ Section */}
                    <section>
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <HelpCircle className="text-cyan-400" size={24} />
                            Frequently Asked Questions
                        </h2>
                        <div className="space-y-4">
                            {FAQS.map((faq, i) => (
                                <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
                                    <button
                                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                        className="w-full p-5 flex justify-between items-center text-left hover:bg-[var(--card-hover)] transition-all font-semibold text-white"
                                    >
                                        {faq.question}
                                        {openFaq === i ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>
                                    {openFaq === i && (
                                        <div className="p-5 pt-0 text-[var(--text-muted)] text-sm leading-relaxed border-t border-[var(--border)] bg-[var(--background-alt)]">
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
                            Platform Tips & Pro-Tricks
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {TIPS.map((tip, i) => (
                                <div key={i} className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl group hover:border-cyan-500/30 transition-all shadow-sm">
                                    <div className="p-3 bg-cyan-500/10 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                                        <tip.icon className="text-cyan-400" size={24} />
                                    </div>
                                    <h3 className="text-white font-bold mb-2">{tip.title}</h3>
                                    <p className="text-[var(--text-dim)] text-xs leading-relaxed">{tip.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Mini Chatbot Side Panel */}
                <div className="relative">
                    <div className="sticky top-24 bg-[var(--card)] border border-[var(--border)] rounded-3xl h-[600px] flex flex-col shadow-xl overflow-hidden">
                        <div className="p-5 bg-gradient-to-r from-cyan-600/10 to-transparent border-b border-[var(--border)] flex items-center gap-3">
                            <div className="p-2 bg-cyan-500/20 rounded-lg">
                                <Bot className="text-cyan-400" size={20} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm">Astute Helper</h3>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                    <p className="text-[10px] text-green-500 font-medium">Assistant Online</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 p-5 overflow-y-auto space-y-4 text-sm">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3.5 rounded-2xl ${msg.role === 'user'
                                        ? 'bg-cyan-600 text-white rounded-tr-none shadow-lg'
                                        : 'bg-[var(--background-alt)] text-[var(--text-muted)] border border-[var(--border)] rounded-tl-none'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleSendMessage} className="p-4 bg-[var(--background-alt)] border-t border-[var(--border)]">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type your question..."
                                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl pl-4 pr-12 py-3 text-white text-sm focus:outline-none focus:border-cyan-500 transition-all placeholder:text-[var(--text-muted)]"
                                />
                                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-cyan-500 rounded-lg text-white hover:bg-cyan-600 transition-all shadow-md">
                                    <Send size={16} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
