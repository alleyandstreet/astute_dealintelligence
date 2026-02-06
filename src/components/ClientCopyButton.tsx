"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

export default function ClientCopyButton({ text, label = "Caption" }: { text: string, label?: string }) {
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard!`);
    };

    return (
        <button
            onClick={handleCopy}
            className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 text-white rounded-lg flex items-center justify-center gap-2 text-xs font-medium transition-colors cursor-pointer"
        >
            <Copy className="w-3.5 h-3.5" />
            Copy {label}
        </button>
    );
}
