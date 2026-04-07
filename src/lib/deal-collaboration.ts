type DealSyncEvent = {
    type: "deals_changed";
    reason: string;
    version: number;
    at: string;
};

type Listener = (event: DealSyncEvent) => void;

type PresenceEntry = {
    userId: string;
    username: string;
    email?: string | null;
    role?: string | null;
    dealId: string;
    lastSeenAt: number;
};

type CollaborationState = {
    version: number;
    listeners: Map<string, Listener>;
    presencesByUserId: Map<string, PresenceEntry>;
};

export type DealActiveCollaborator = {
    userId: string;
    username: string;
    email?: string | null;
    role?: string | null;
    lastSeenAt: string;
};

const PRESENCE_TTL_MS = 45_000;

declare global {
    var __dealCollaborationState: CollaborationState | undefined;
}

function getState(): CollaborationState {
    if (!globalThis.__dealCollaborationState) {
        globalThis.__dealCollaborationState = {
            version: 1,
            listeners: new Map<string, Listener>(),
            presencesByUserId: new Map<string, PresenceEntry>(),
        };
    }
    return globalThis.__dealCollaborationState;
}

function cleanupPresenceEntries(now = Date.now()) {
    const state = getState();
    for (const [userId, entry] of state.presencesByUserId.entries()) {
        if (now - entry.lastSeenAt > PRESENCE_TTL_MS) {
            state.presencesByUserId.delete(userId);
        }
    }
}

export function getPresenceTtlSeconds(): number {
    return Math.floor(PRESENCE_TTL_MS / 1000);
}

export function publishDealsChanged(reason: string) {
    const state = getState();
    state.version += 1;

    const event: DealSyncEvent = {
        type: "deals_changed",
        reason,
        version: state.version,
        at: new Date().toISOString(),
    };

    for (const listener of state.listeners.values()) {
        try {
            listener(event);
        } catch (error) {
            console.error("Deal collaboration listener error:", error);
        }
    }
}

export function subscribeToDealEvents(listener: Listener): () => void {
    const state = getState();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    state.listeners.set(id, listener);

    return () => {
        state.listeners.delete(id);
    };
}

export function getCurrentDealsVersion(): number {
    return getState().version;
}

export function upsertDealPresence(params: {
    userId: string;
    username: string;
    email?: string | null;
    role?: string | null;
    dealId: string;
}) {
    const state = getState();
    cleanupPresenceEntries();

    state.presencesByUserId.set(params.userId, {
        userId: params.userId,
        username: params.username,
        email: params.email ?? null,
        role: params.role ?? null,
        dealId: params.dealId,
        lastSeenAt: Date.now(),
    });
}

export function clearDealPresence(userId: string) {
    const state = getState();
    state.presencesByUserId.delete(userId);
}

export function getPresenceByDeal(): Record<string, DealActiveCollaborator[]> {
    cleanupPresenceEntries();
    const state = getState();

    const presenceByDeal: Record<string, DealActiveCollaborator[]> = {};
    for (const entry of state.presencesByUserId.values()) {
        if (!presenceByDeal[entry.dealId]) {
            presenceByDeal[entry.dealId] = [];
        }
        presenceByDeal[entry.dealId].push({
            userId: entry.userId,
            username: entry.username,
            email: entry.email ?? null,
            role: entry.role ?? null,
            lastSeenAt: new Date(entry.lastSeenAt).toISOString(),
        });
    }

    for (const dealId of Object.keys(presenceByDeal)) {
        presenceByDeal[dealId].sort((a, b) => {
            return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
        });
    }

    return presenceByDeal;
}
