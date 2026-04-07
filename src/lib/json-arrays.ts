export function toStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value
            .map((item) => String(item || "").trim())
            .filter(Boolean);
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return [];

        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed
                    .map((item) => String(item || "").trim())
                    .filter(Boolean);
            }
        } catch {
            // Ignore and fall back to CSV parsing.
        }

        return trimmed
            .split(/[,\s]+/)
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
}

export function toUniqueStringArray(value: unknown): string[] {
    return [...new Set(toStringArray(value))];
}
