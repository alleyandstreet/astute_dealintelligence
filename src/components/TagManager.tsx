"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Tag, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TagData {
    id: string;
    name: string;
    color: string;
}

interface DealTagData {
    id: string;
    tagId: string;
    tag: TagData;
}

interface TagManagerProps {
    dealId: string;
    dealTags: DealTagData[];
    onTagsChange: (tags: DealTagData[]) => void;
}

const TAG_COLORS = [
    "#06b6d4", // cyan
    "#10b981", // green
    "#f59e0b", // amber
    "#8b5cf6", // purple
    "#ef4444", // red
    "#ec4899", // pink
    "#3b82f6", // blue
    "#84cc16", // lime
];

export default function TagManager({ dealId, dealTags, onTagsChange }: TagManagerProps) {
    const [allTags, setAllTags] = useState<TagData[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [newTagName, setNewTagName] = useState("");
    const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
    const [isCreating, setIsCreating] = useState(false);
    const [isAdding, setIsAdding] = useState<string | null>(null);

    useEffect(() => {
        fetchTags();
    }, []);

    const fetchTags = async () => {
        try {
            const res = await fetch("/api/tags");
            if (res.ok) {
                const data = await res.json();
                setAllTags(data);
            }
        } catch (error) {
            console.error("Failed to fetch tags:", error);
        }
    };

    const createTag = async () => {
        if (!newTagName.trim()) return;
        setIsCreating(true);
        try {
            const res = await fetch("/api/tags", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newTagName, color: newTagColor }),
            });
            if (res.ok) {
                const tag = await res.json();
                setAllTags([...allTags, tag]);
                setNewTagName("");
                toast.success("Tag created!");
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to create tag");
            }
        } catch (error) {
            toast.error("Failed to create tag");
        } finally {
            setIsCreating(false);
        }
    };

    const addTagToDeal = async (tagId: string) => {
        setIsAdding(tagId);
        try {
            const res = await fetch("/api/deal-tags", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dealId, tagId }),
            });
            if (res.ok) {
                const dealTag = await res.json();
                onTagsChange([...dealTags, dealTag]);
                toast.success("Tag added!");
            }
        } catch (error) {
            toast.error("Failed to add tag");
        } finally {
            setIsAdding(null);
        }
    };

    const removeTagFromDeal = async (tagId: string) => {
        try {
            await fetch(`/api/deal-tags?dealId=${dealId}&tagId=${tagId}`, {
                method: "DELETE",
            });
            onTagsChange(dealTags.filter((dt) => dt.tagId !== tagId));
            toast.success("Tag removed");
        } catch (error) {
            toast.error("Failed to remove tag");
        }
    };

    const appliedTagIds = dealTags.map((dt) => dt.tagId);
    const availableTags = allTags.filter((t) => !appliedTagIds.includes(t.id));

    return (
        <div className="space-y-3">
            {/* Applied Tags */}
            <div className="flex flex-wrap gap-2">
                {dealTags.map((dt) => (
                    <motion.span
                        key={dt.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-white"
                        style={{ backgroundColor: dt.tag.color + "30", borderColor: dt.tag.color, borderWidth: 1 }}
                    >
                        <Tag className="w-3 h-3" style={{ color: dt.tag.color }} />
                        <span style={{ color: dt.tag.color }}>{dt.tag.name}</span>
                        <button
                            onClick={() => removeTagFromDeal(dt.tagId)}
                            className="ml-1 hover:opacity-70"
                            style={{ color: dt.tag.color }}
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </motion.span>
                ))}

                {/* Add Tag Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-[var(--background)] text-[var(--text-muted)] hover:text-white border border-[var(--border)] hover:border-[var(--border-light)] transition-colors"
                >
                    <Plus className="w-3 h-3" />
                    Add Tag
                </button>
            </div>

            {/* Tag Picker Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-4"
                    >
                        {/* Existing Tags */}
                        {availableTags.length > 0 && (
                            <div>
                                <p className="text-xs text-[var(--text-dim)] mb-2">Available Tags</p>
                                <div className="flex flex-wrap gap-2">
                                    {availableTags.map((tag) => (
                                        <button
                                            key={tag.id}
                                            onClick={() => addTagToDeal(tag.id)}
                                            disabled={isAdding === tag.id}
                                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-all hover:scale-105"
                                            style={{ backgroundColor: tag.color + "20", color: tag.color }}
                                        >
                                            {isAdding === tag.id ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Plus className="w-3 h-3" />
                                            )}
                                            {tag.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Create New Tag */}
                        <div>
                            <p className="text-xs text-[var(--text-dim)] mb-2">Create New Tag</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newTagName}
                                    onChange={(e) => setNewTagName(e.target.value)}
                                    placeholder="Tag name..."
                                    className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--text-dim)] focus:border-cyan-500 focus:outline-none"
                                />
                                <div className="flex gap-1">
                                    {TAG_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setNewTagColor(color)}
                                            className={`w-6 h-6 rounded-full transition-transform ${newTagColor === color ? "scale-125 ring-2 ring-white" : ""
                                                }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                                <button
                                    onClick={createTag}
                                    disabled={isCreating || !newTagName.trim()}
                                    className="px-3 py-2 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-600 disabled:opacity-50 transition-colors"
                                >
                                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
