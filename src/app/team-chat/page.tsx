"use client";

import ChatInterface from "@/components/ChatInterface";

export default function TeamChatPage() {
    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-100px)] flex flex-col gap-4">
            <div className="mb-2">
                <h1 className="text-3xl font-bold text-white mb-2">Team Chat</h1>
                <p className="text-[var(--text-muted)]">Collaborate with your team in real-time.</p>
            </div>

            <div className="flex-1 min-h-0">
                <ChatInterface mode="full" />
            </div>
        </div>
    );
}
