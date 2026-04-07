"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { HUB_FEATURE_DEFINITIONS, type HubFeatureKey } from "@/lib/feature-access";
import { type TeamRateLimitKey } from "@/lib/team-controls";
import { Loader2, Save, Shield, SlidersHorizontal, UserCheck, Users, WandSparkles } from "lucide-react";

type TeamUser = {
    id: string;
    username: string;
    email?: string | null;
    role: string;
    isActive: boolean;
    createdAt: string;
};

type TeamRateLimitRule = {
    enabled: boolean;
    maxRequests: number;
    windowSeconds: number;
};

type TeamRateLimits = Record<TeamRateLimitKey, TeamRateLimitRule>;

type Template = {
    id: string;
    name: string;
    description?: string | null;
    steps: string[];
    isDefault: boolean;
    isActive: boolean;
};

type Assignment = {
    id: string;
    userId: string;
    templateId: string;
    status: string;
    dueDate?: string | null;
    updatedAt: string;
    user: { id: string; username: string; role: string };
    template: { id: string; name: string };
};

type ControlCenterPayload = {
    featureDefinitions: { key: HubFeatureKey; label: string }[];
    users: TeamUser[];
    accessByUser: Record<string, Record<HubFeatureKey, boolean>>;
    rateLimits: TeamRateLimits;
    onboarding: {
        settings: { autoAssignTemplateId: string | null };
        templates: Template[];
        assignments: Assignment[];
    };
};

type SessionUser = { role?: string };

export default function AdminControlCenterPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const userRole = (session?.user as SessionUser | undefined)?.role;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState<ControlCenterPayload | null>(null);
    const [rateLimitDrafts, setRateLimitDrafts] = useState<TeamRateLimits | null>(null);
    const [newTemplate, setNewTemplate] = useState({
        name: "",
        description: "",
        stepsText: "",
        isDefault: false,
    });
    const [assignTemplateByUser, setAssignTemplateByUser] = useState<Record<string, string>>({});

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated" && userRole !== "super_admin") {
            router.push("/");
        }
    }, [status, userRole, router]);

    const fetchData = async () => {
        try {
            const response = await fetch("/api/admin/team-controls");
            if (!response.ok) throw new Error("Failed to load team controls");
            const payload = (await response.json()) as ControlCenterPayload;
            setData(payload);
            setRateLimitDrafts(payload.rateLimits);
        } catch (error) {
            console.error(error);
            toast.error("Could not load control center");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userRole === "super_admin") {
            fetchData();
        }
    }, [userRole]);

    const latestAssignmentByUser = useMemo(() => {
        const map: Record<string, Assignment | undefined> = {};
        if (!data) return map;
        for (const assignment of data.onboarding.assignments) {
            if (!map[assignment.userId]) {
                map[assignment.userId] = assignment;
            }
        }
        return map;
    }, [data]);

    const postAction = async (body: Record<string, unknown>) => {
        setSaving(true);
        try {
            const response = await fetch("/api/admin/team-controls", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error || "Action failed");
            }
            return payload;
        } finally {
            setSaving(false);
        }
    };

    const handleFeatureToggle = async (userId: string, featureKey: HubFeatureKey, enabled: boolean) => {
        if (!data) return;

        const previous = data.accessByUser[userId]?.[featureKey];
        setData((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                accessByUser: {
                    ...prev.accessByUser,
                    [userId]: {
                        ...prev.accessByUser[userId],
                        [featureKey]: enabled,
                    },
                },
            };
        });

        try {
            await postAction({ action: "set_feature_access", userId, featureKey, enabled });
            toast.success("Feature access updated");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Could not update access");
            setData((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    accessByUser: {
                        ...prev.accessByUser,
                        [userId]: {
                            ...prev.accessByUser[userId],
                            [featureKey]: previous,
                        },
                    },
                };
            });
        }
    };

    const handleSaveRateLimit = async (key: TeamRateLimitKey) => {
        if (!rateLimitDrafts) return;
        const rule = rateLimitDrafts[key];
        try {
            const payload = await postAction({
                action: "set_rate_limit",
                key,
                enabled: rule.enabled,
                maxRequests: rule.maxRequests,
                windowSeconds: rule.windowSeconds,
            });
            setData((prev) => (prev ? { ...prev, rateLimits: payload.rateLimits as TeamRateLimits } : prev));
            setRateLimitDrafts(payload.rateLimits as TeamRateLimits);
            toast.success("Rate limit saved");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Could not save rate limit");
        }
    };

    const handleCreateTemplate = async () => {
        const name = newTemplate.name.trim();
        const steps = newTemplate.stepsText
            .split("\n")
            .map((step) => step.trim())
            .filter(Boolean);

        if (!name) {
            toast.error("Template name is required");
            return;
        }
        if (steps.length === 0) {
            toast.error("Add at least one onboarding step");
            return;
        }

        try {
            await postAction({
                action: "create_onboarding_template",
                name,
                description: newTemplate.description.trim() || null,
                steps,
                isDefault: newTemplate.isDefault,
            });
            toast.success("Onboarding template created");
            setNewTemplate({ name: "", description: "", stepsText: "", isDefault: false });
            await fetchData();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Could not create template");
        }
    };

    const handleDeleteTemplate = async (templateId: string) => {
        if (!confirm("Delete this onboarding template?")) return;
        try {
            await postAction({ action: "delete_onboarding_template", templateId });
            toast.success("Template deleted");
            await fetchData();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Could not delete template");
        }
    };

    const handleSetAutoAssign = async (templateId: string | null) => {
        try {
            await postAction({ action: "set_auto_assign_template", templateId });
            toast.success("Default onboarding assignment updated");
            await fetchData();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Could not update default assignment");
        }
    };

    const handleAssignTemplate = async (userId: string) => {
        const templateId = assignTemplateByUser[userId];
        if (!templateId) {
            toast.error("Select a template first");
            return;
        }

        try {
            await postAction({
                action: "assign_onboarding_template",
                userId,
                templateId,
            });
            toast.success("Template assigned");
            await fetchData();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Could not assign template");
        }
    };

    const handleUpdateAssignmentStatus = async (assignmentId: string, statusValue: string) => {
        try {
            await postAction({
                action: "update_onboarding_assignment",
                assignmentId,
                status: statusValue,
            });
            toast.success("Assignment status updated");
            await fetchData();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Could not update assignment");
        }
    };

    if (status === "loading" || loading || !data || !rateLimitDrafts) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex items-center gap-2 text-slate-300">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading control center...
                </div>
            </div>
        );
    }

    if (userRole !== "super_admin") return null;

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Team Control Center</h1>
                    <p className="text-slate-400">
                        Manage feature access, request limits, onboarding tracks, and operating restrictions for larger teams.
                    </p>
                </div>

                <section className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Shield className="w-4 h-4 text-cyan-400" />
                        <h2 className="text-white font-semibold">Feature Access Matrix</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-400 border-b border-slate-700/50">
                                    <th className="py-2 pr-4">User</th>
                                    {HUB_FEATURE_DEFINITIONS.map((feature) => (
                                        <th key={feature.key} className="py-2 pr-4">{feature.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.users.map((user) => (
                                    <tr key={user.id} className="border-b border-slate-800/50">
                                        <td className="py-2 pr-4">
                                            <p className="text-white font-medium">{user.username}</p>
                                            <p className="text-xs text-slate-500">{user.role}</p>
                                        </td>
                                        {HUB_FEATURE_DEFINITIONS.map((feature) => {
                                            const enabled = data.accessByUser[user.id]?.[feature.key] ?? false;
                                            const lockedForSuperAdmin = user.role === "super_admin" && feature.key === "admin_control";
                                            return (
                                                <td key={feature.key} className="py-2 pr-4">
                                                    <label className={`inline-flex items-center gap-2 ${lockedForSuperAdmin ? "opacity-60" : ""}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={enabled}
                                                            disabled={saving || lockedForSuperAdmin}
                                                            onChange={(event) => handleFeatureToggle(user.id, feature.key, event.target.checked)}
                                                        />
                                                        <span className="text-xs text-slate-300">{enabled ? "Allow" : "Block"}</span>
                                                    </label>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <SlidersHorizontal className="w-4 h-4 text-amber-300" />
                        <h2 className="text-white font-semibold">Rate Limits</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(Object.keys(rateLimitDrafts) as TeamRateLimitKey[]).map((key) => {
                            const rule = rateLimitDrafts[key];
                            return (
                                <div key={key} className="border border-slate-700/40 rounded-xl p-4 space-y-3">
                                    <p className="text-sm text-white font-medium">{key}</p>
                                    <label className="flex items-center gap-2 text-sm text-slate-300">
                                        <input
                                            type="checkbox"
                                            checked={rule.enabled}
                                            onChange={(event) => setRateLimitDrafts((prev) => prev ? {
                                                ...prev,
                                                [key]: { ...prev[key], enabled: event.target.checked },
                                            } : prev)}
                                        />
                                        Enabled
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="number"
                                            min={1}
                                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm"
                                            value={rule.maxRequests}
                                            onChange={(event) => setRateLimitDrafts((prev) => prev ? {
                                                ...prev,
                                                [key]: { ...prev[key], maxRequests: Number(event.target.value || 1) },
                                            } : prev)}
                                        />
                                        <input
                                            type="number"
                                            min={1}
                                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm"
                                            value={rule.windowSeconds}
                                            onChange={(event) => setRateLimitDrafts((prev) => prev ? {
                                                ...prev,
                                                [key]: { ...prev[key], windowSeconds: Number(event.target.value || 1) },
                                            } : prev)}
                                        />
                                    </div>
                                    <button
                                        className="btn-secondary w-full flex items-center justify-center gap-2"
                                        disabled={saving}
                                        onClick={() => handleSaveRateLimit(key)}
                                    >
                                        <Save className="w-4 h-4" />
                                        Save Limit
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center gap-2">
                            <WandSparkles className="w-4 h-4 text-emerald-300" />
                            <h2 className="text-white font-semibold">Create Onboarding Template</h2>
                        </div>
                        <input
                            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                            placeholder="Template name"
                            value={newTemplate.name}
                            onChange={(event) => setNewTemplate((prev) => ({ ...prev, name: event.target.value }))}
                        />
                        <textarea
                            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm min-h-[70px]"
                            placeholder="Description"
                            value={newTemplate.description}
                            onChange={(event) => setNewTemplate((prev) => ({ ...prev, description: event.target.value }))}
                        />
                        <textarea
                            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm min-h-[140px]"
                            placeholder="One onboarding step per line"
                            value={newTemplate.stepsText}
                            onChange={(event) => setNewTemplate((prev) => ({ ...prev, stepsText: event.target.value }))}
                        />
                        <label className="flex items-center gap-2 text-sm text-slate-300">
                            <input
                                type="checkbox"
                                checked={newTemplate.isDefault}
                                onChange={(event) => setNewTemplate((prev) => ({ ...prev, isDefault: event.target.checked }))}
                            />
                            Set as default for new employees
                        </label>
                        <button
                            className="btn-primary w-full"
                            disabled={saving}
                            onClick={handleCreateTemplate}
                        >
                            Create Template
                        </button>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-cyan-300" />
                            <h2 className="text-white font-semibold">Onboarding Library</h2>
                        </div>
                        <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
                            {data.onboarding.templates.map((template) => (
                                <div key={template.id} className="border border-slate-700/50 rounded-lg p-3">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <div>
                                            <p className="text-white font-medium">{template.name}</p>
                                            <p className="text-xs text-slate-500">
                                                {template.steps.length} steps
                                                {template.isDefault ? " • default" : ""}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                className="btn-secondary text-xs px-2 py-1"
                                                onClick={() => handleSetAutoAssign(template.id)}
                                                disabled={saving}
                                            >
                                                Auto-Assign
                                            </button>
                                            <button
                                                className="btn-secondary text-xs px-2 py-1 !text-rose-300"
                                                onClick={() => handleDeleteTemplate(template.id)}
                                                disabled={saving}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                    {template.description && (
                                        <p className="text-xs text-slate-400 mb-2">{template.description}</p>
                                    )}
                                    <ul className="text-xs text-slate-300 space-y-1">
                                        {template.steps.slice(0, 4).map((step, index) => (
                                            <li key={`${template.id}-${index}`}>{index + 1}. {step}</li>
                                        ))}
                                        {template.steps.length > 4 && (
                                            <li className="text-slate-500">+{template.steps.length - 4} more steps</li>
                                        )}
                                    </ul>
                                </div>
                            ))}
                        </div>
                        <div className="pt-1">
                            <label className="text-xs text-slate-400 block mb-1">Auto-assign template for new users</label>
                            <select
                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-2 text-sm"
                                value={data.onboarding.settings.autoAssignTemplateId || ""}
                                onChange={(event) => handleSetAutoAssign(event.target.value || null)}
                            >
                                <option value="">No automatic onboarding</option>
                                {data.onboarding.templates
                                    .filter((template) => template.isActive)
                                    .map((template) => (
                                        <option key={template.id} value={template.id}>{template.name}</option>
                                    ))}
                            </select>
                        </div>
                    </div>
                </section>

                <section className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="w-4 h-4 text-emerald-300" />
                        <h2 className="text-white font-semibold">Onboarding Assignment Tracker</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-400 border-b border-slate-700/50">
                                    <th className="py-2 pr-3">User</th>
                                    <th className="py-2 pr-3">Assign Template</th>
                                    <th className="py-2 pr-3">Latest Status</th>
                                    <th className="py-2 pr-3">Last Updated</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.users.map((user) => {
                                    const latest = latestAssignmentByUser[user.id];
                                    return (
                                        <tr key={user.id} className="border-b border-slate-800/60">
                                            <td className="py-2 pr-3">
                                                <p className="text-white font-medium">{user.username}</p>
                                                <p className="text-xs text-slate-500">{user.role}</p>
                                            </td>
                                            <td className="py-2 pr-3">
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
                                                        value={assignTemplateByUser[user.id] || ""}
                                                        onChange={(event) =>
                                                            setAssignTemplateByUser((prev) => ({ ...prev, [user.id]: event.target.value }))
                                                        }
                                                    >
                                                        <option value="">Select template</option>
                                                        {data.onboarding.templates
                                                            .filter((template) => template.isActive)
                                                            .map((template) => (
                                                                <option key={template.id} value={template.id}>{template.name}</option>
                                                            ))}
                                                    </select>
                                                    <button
                                                        className="btn-secondary text-xs px-2 py-1"
                                                        onClick={() => handleAssignTemplate(user.id)}
                                                        disabled={saving}
                                                    >
                                                        Assign
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-2 pr-3">
                                                {latest ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-slate-300">{latest.template.name}</span>
                                                        <select
                                                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
                                                            value={latest.status}
                                                            onChange={(event) => handleUpdateAssignmentStatus(latest.id, event.target.value)}
                                                        >
                                                            <option value="assigned">assigned</option>
                                                            <option value="in_progress">in_progress</option>
                                                            <option value="blocked">blocked</option>
                                                            <option value="completed">completed</option>
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-500">No assignment</span>
                                                )}
                                            </td>
                                            <td className="py-2 pr-3 text-xs text-slate-400">
                                                {latest ? new Date(latest.updatedAt).toLocaleString() : "-"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
}

