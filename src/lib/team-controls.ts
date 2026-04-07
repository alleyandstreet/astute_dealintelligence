import { db } from "@/lib/db";
import { HUB_FEATURE_KEYS, type HubFeatureKey } from "@/lib/feature-access";

export const TEAM_RATE_LIMIT_KEYS = [
    "deal_sourcing_requests",
    "market_intelligence_requests",
    "content_engine_requests",
    "team_crm_requests",
] as const;

export type TeamRateLimitKey = (typeof TEAM_RATE_LIMIT_KEYS)[number];

export type TeamRateLimitRule = {
    enabled: boolean;
    maxRequests: number;
    windowSeconds: number;
};

export type TeamRateLimits = Record<TeamRateLimitKey, TeamRateLimitRule>;

type TeamOnboardingSettings = {
    autoAssignTemplateId: string | null;
};

const RATE_LIMIT_SETTING_KEY = "team_rate_limits";
const ONBOARDING_SETTING_KEY = "team_onboarding_settings";

const DEFAULT_MEMBER_ACCESS: Record<HubFeatureKey, boolean> = {
    deal_sourcing: true,
    market_intelligence: true,
    content_engine: true,
    team_crm: true,
    admin_control: false,
};

const DEFAULT_RATE_LIMITS: TeamRateLimits = {
    deal_sourcing_requests: { enabled: true, maxRequests: 120, windowSeconds: 60 },
    market_intelligence_requests: { enabled: true, maxRequests: 25, windowSeconds: 60 },
    content_engine_requests: { enabled: true, maxRequests: 40, windowSeconds: 60 },
    team_crm_requests: { enabled: true, maxRequests: 180, windowSeconds: 60 },
};

const rateLimitCounters = new Map<string, { count: number; resetAt: number }>();

function isHubFeatureKey(value: string): value is HubFeatureKey {
    return (HUB_FEATURE_KEYS as readonly string[]).includes(value);
}

function isRateLimitKey(value: string): value is TeamRateLimitKey {
    return (TEAM_RATE_LIMIT_KEYS as readonly string[]).includes(value);
}

function toClampedInt(value: unknown, fallback: number, min: number, max: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function allFeaturesEnabled(): Record<HubFeatureKey, boolean> {
    return {
        deal_sourcing: true,
        market_intelligence: true,
        content_engine: true,
        team_crm: true,
        admin_control: true,
    };
}

function getRoleDefaultAccess(role?: string | null): Record<HubFeatureKey, boolean> {
    if (role === "super_admin") return allFeaturesEnabled();
    return { ...DEFAULT_MEMBER_ACCESS };
}

async function readSetting<T>(key: string): Promise<T | null> {
    const setting = await db.appSetting.findUnique({ where: { key } });
    if (!setting) return null;
    return setting.value as T;
}

async function writeSetting<T>(key: string, value: T) {
    await db.appSetting.upsert({
        where: { key },
        create: { key, value: value as object },
        update: { value: value as object },
    });
}

function sanitizeRateLimits(raw: unknown): TeamRateLimits {
    const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

    const normalized = { ...DEFAULT_RATE_LIMITS };
    for (const key of TEAM_RATE_LIMIT_KEYS) {
        const candidate = (source[key] && typeof source[key] === "object" ? source[key] : {}) as Record<string, unknown>;
        normalized[key] = {
            enabled: Boolean(candidate.enabled ?? DEFAULT_RATE_LIMITS[key].enabled),
            maxRequests: toClampedInt(candidate.maxRequests, DEFAULT_RATE_LIMITS[key].maxRequests, 1, 5000),
            windowSeconds: toClampedInt(candidate.windowSeconds, DEFAULT_RATE_LIMITS[key].windowSeconds, 1, 3600),
        };
    }

    return normalized;
}

function sanitizeOnboardingSettings(raw: unknown): TeamOnboardingSettings {
    const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    return {
        autoAssignTemplateId:
            typeof source.autoAssignTemplateId === "string" && source.autoAssignTemplateId.trim().length > 0
                ? source.autoAssignTemplateId
                : null,
    };
}

export async function getTeamRateLimits(): Promise<TeamRateLimits> {
    const stored = await readSetting<unknown>(RATE_LIMIT_SETTING_KEY);
    return sanitizeRateLimits(stored);
}

export async function setTeamRateLimits(limits: TeamRateLimits): Promise<TeamRateLimits> {
    const normalized = sanitizeRateLimits(limits);
    await writeSetting(RATE_LIMIT_SETTING_KEY, normalized);
    return normalized;
}

export async function updateSingleRateLimit(
    key: TeamRateLimitKey,
    patch: Partial<TeamRateLimitRule>,
): Promise<TeamRateLimits> {
    const current = await getTeamRateLimits();
    const currentRule = current[key];
    const next = {
        ...current,
        [key]: sanitizeRateLimits({
            [key]: {
                enabled: patch.enabled ?? currentRule.enabled,
                maxRequests: patch.maxRequests ?? currentRule.maxRequests,
                windowSeconds: patch.windowSeconds ?? currentRule.windowSeconds,
            },
        })[key],
    };
    await writeSetting(RATE_LIMIT_SETTING_KEY, next);
    return next;
}

export async function enforceTeamRateLimit(params: {
    key: TeamRateLimitKey;
    userId: string;
}): Promise<{
    allowed: boolean;
    retryAfterSeconds: number;
    rule: TeamRateLimitRule;
}> {
    const rateLimits = await getTeamRateLimits();
    const rule = rateLimits[params.key];
    const now = Date.now();

    if (!rule.enabled) {
        return { allowed: true, retryAfterSeconds: 0, rule };
    }

    const counterKey = `${params.key}:${params.userId}`;
    const existing = rateLimitCounters.get(counterKey);

    if (!existing || now >= existing.resetAt) {
        rateLimitCounters.set(counterKey, {
            count: 1,
            resetAt: now + rule.windowSeconds * 1000,
        });
        return { allowed: true, retryAfterSeconds: 0, rule };
    }

    if (existing.count >= rule.maxRequests) {
        const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
        return {
            allowed: false,
            retryAfterSeconds,
            rule,
        };
    }

    existing.count += 1;
    rateLimitCounters.set(counterKey, existing);
    return { allowed: true, retryAfterSeconds: 0, rule };
}

export async function getUserFeatureAccessMap(userId: string, role?: string | null): Promise<Record<HubFeatureKey, boolean>> {
    if (role === "super_admin") {
        return allFeaturesEnabled();
    }

    const base = getRoleDefaultAccess(role);
    const overrides = await db.userFeatureAccess.findMany({
        where: { userId },
        select: { featureKey: true, enabled: true },
    });

    for (const override of overrides) {
        if (isHubFeatureKey(override.featureKey)) {
            base[override.featureKey] = override.enabled;
        }
    }

    base.admin_control = false;
    return base;
}

export async function setUserFeatureAccess(params: {
    userId: string;
    userRole?: string | null;
    featureKey: HubFeatureKey;
    enabled: boolean;
}): Promise<Record<HubFeatureKey, boolean>> {
    const forceEnabled = params.featureKey === "admin_control" && params.userRole === "super_admin";
    const nextEnabled = forceEnabled ? true : Boolean(params.enabled);

    await db.userFeatureAccess.upsert({
        where: {
            userId_featureKey: {
                userId: params.userId,
                featureKey: params.featureKey,
            },
        },
        create: {
            userId: params.userId,
            featureKey: params.featureKey,
            enabled: nextEnabled,
        },
        update: {
            enabled: nextEnabled,
        },
    });

    return getUserFeatureAccessMap(params.userId, params.userRole);
}

export async function canUserAccessFeature(
    userId: string,
    role: string | null | undefined,
    featureKey: HubFeatureKey,
): Promise<boolean> {
    const map = await getUserFeatureAccessMap(userId, role);
    return Boolean(map[featureKey]);
}

export async function getOnboardingSettings(): Promise<TeamOnboardingSettings> {
    const stored = await readSetting<unknown>(ONBOARDING_SETTING_KEY);
    return sanitizeOnboardingSettings(stored);
}

export async function setOnboardingSettings(settings: TeamOnboardingSettings): Promise<TeamOnboardingSettings> {
    const normalized = sanitizeOnboardingSettings(settings);
    await writeSetting(ONBOARDING_SETTING_KEY, normalized);
    return normalized;
}

export async function setAutoAssignOnboardingTemplate(templateId: string | null): Promise<TeamOnboardingSettings> {
    if (!templateId) {
        return setOnboardingSettings({ autoAssignTemplateId: null });
    }

    const template = await db.onboardingTemplate.findUnique({
        where: { id: templateId },
        select: { id: true, isActive: true },
    });

    if (!template || !template.isActive) {
        return setOnboardingSettings({ autoAssignTemplateId: null });
    }

    return setOnboardingSettings({ autoAssignTemplateId: template.id });
}

export async function getLatestOnboardingAssignment(userId: string) {
    return db.onboardingAssignment.findFirst({
        where: { userId },
        include: {
            template: {
                select: {
                    id: true,
                    name: true,
                    description: true,
                    steps: true,
                    isActive: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });
}

export async function autoAssignDefaultOnboardingTemplate(params: {
    userId: string;
    assignedById?: string | null;
}) {
    const settings = await getOnboardingSettings();
    const templateId = settings.autoAssignTemplateId;

    if (!templateId) return null;

    const template = await db.onboardingTemplate.findUnique({
        where: { id: templateId },
        select: { id: true, isActive: true },
    });

    if (!template || !template.isActive) {
        await setOnboardingSettings({ autoAssignTemplateId: null });
        return null;
    }

    const activeExisting = await db.onboardingAssignment.findFirst({
        where: {
            userId: params.userId,
            templateId: template.id,
            status: { in: ["assigned", "in_progress"] },
        },
        orderBy: { createdAt: "desc" },
    });

    if (activeExisting) {
        return activeExisting;
    }

    return db.onboardingAssignment.create({
        data: {
            userId: params.userId,
            templateId: template.id,
            assignedById: params.assignedById || null,
            status: "assigned",
            progress: {},
        },
    });
}

export function isValidRateLimitKey(value: string): value is TeamRateLimitKey {
    return isRateLimitKey(value);
}
