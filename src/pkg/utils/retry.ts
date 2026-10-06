export interface RetryOptions {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    factor?: number;
    retryableError?: (err: unknown) => boolean;
}

export async function withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxRetries = 3,
        initialDelayMs = 100,
        maxDelayMs = 2000,
        factor = 2,
        retryableError = () => true,
    } = options;

    let attempt = 0;
    let delay = initialDelayMs;

    while (true) {
        try {
            return await operation();
        } catch (err) {
            attempt++;
            if (attempt > maxRetries || !retryableError(err)) {
                throw err;
            }

            const jitter = Math.random() * 50;
            const waitTime = Math.min(delay + jitter, maxDelayMs);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            delay *= factor;
        }
    }
}
