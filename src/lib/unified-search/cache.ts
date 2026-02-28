interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

function cleanupExpired() {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
        if (entry.expiresAt <= now) {
            store.delete(key);
        }
    }
}

export function buildCacheKey(parts: Array<string | number | undefined | null>): string {
    return parts
        .map((part) => (part === undefined || part === null ? "" : String(part).trim().toLowerCase()))
        .join("::");
}

export function readCache<T>(key: string): T | null {
    cleanupExpired();
    const cached = store.get(key);
    if (!cached) return null;
    return cached.value as T;
}

export function writeCache<T>(key: string, value: T, ttlMs: number) {
    cleanupExpired();
    store.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
    });
}

export function clearCache(prefix?: string) {
    if (!prefix) {
        store.clear();
        return;
    }

    const normalized = prefix.toLowerCase();
    for (const key of store.keys()) {
        if (key.startsWith(normalized)) {
            store.delete(key);
        }
    }
}
