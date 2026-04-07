interface TimeoutOptions {
    timeoutMs?: number;
    label?: string;
}

export async function withTimeout<T>(
    promise: Promise<T>,
    { timeoutMs = 12000, label = "request" }: TimeoutOptions = {},
): Promise<T> {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
            reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
    }
}

export async function fetchJsonWithTimeout<T>(
    input: RequestInfo | URL,
    init: RequestInit,
    { timeoutMs = 12000, label = "request" }: TimeoutOptions = {},
): Promise<T> {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(input, {
            ...init,
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`${label} failed (${response.status})`);
        }

        return (await response.json()) as T;
    } finally {
        clearTimeout(timeoutHandle);
    }
}
