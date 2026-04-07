export interface RetryOptions {
    retries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
}

export async function withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions,
    onRetry?: (attempt: number, error: unknown) => void,
): Promise<T> {
    const { retries, baseDelayMs, maxDelayMs, shouldRetry } = options;

    let attempt = 0;
    while (true) {
        try {
            return await operation();
        } catch (error) {
            if (shouldRetry && !shouldRetry(error, attempt + 1)) {
                throw error;
            }

            if (attempt >= retries) {
                throw error;
            }

            attempt += 1;
            if (onRetry) onRetry(attempt, error);

            const jitter = Math.floor(Math.random() * 200);
            const waitMs = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1) + jitter);
            await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
    }
}
