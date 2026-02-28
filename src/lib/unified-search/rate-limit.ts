const requestHistory = new Map<string, number[]>();

export async function enforceRateLimit(key: string, maxPerMinute: number) {
    if (maxPerMinute <= 0) return;

    const now = Date.now();
    const windowStart = now - 60_000;
    const history = requestHistory.get(key) ?? [];
    const recent = history.filter((timestamp) => timestamp > windowStart);

    if (recent.length >= maxPerMinute) {
        const oldest = recent[0];
        const waitMs = Math.max(0, 60_000 - (now - oldest));
        if (waitMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
    }

    const updatedNow = Date.now();
    const updatedWindowStart = updatedNow - 60_000;
    const updated = (requestHistory.get(key) ?? []).filter((timestamp) => timestamp > updatedWindowStart);
    updated.push(updatedNow);
    requestHistory.set(key, updated);
}
