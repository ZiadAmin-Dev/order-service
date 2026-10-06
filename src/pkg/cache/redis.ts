import Redis from "ioredis";
import type { ICacheProvider } from "./cache.interface";

export interface RedisConfig {
    host: string;
    port: number;
    password?: string;
}

export class RedisCacheProvider implements ICacheProvider {
    private readonly client: Redis;

    constructor(config: RedisConfig) {
        this.client = new Redis({
            host: config.host,
            port: config.port,
            password: config.password || undefined,
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            retryStrategy: () => null,
        });

        this.client.on("error", () => {});
        this.client.connect().catch(() => {});
    }

    getClient(): Redis {
        return this.client;
    }

    private applyJitter(ttlSeconds: number, jitterPercentage = 0.10): number {
        if (ttlSeconds < 10) return ttlSeconds;
        const maxJitter = ttlSeconds * jitterPercentage;
        const jitter = Math.random() * maxJitter * 2 - maxJitter;
        return Math.max(1, ttlSeconds + Math.round(jitter));
    }

    async get(key: string): Promise<any> {
        const value = await this.client.get(key);
        if (value === null) return null;
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }

    async set(key: string, value: any, ttlSeconds?: number): Promise<any> {
        const serializedValue = value === undefined
            ? "undefined"
            : typeof value === "string"
                ? value
                : JSON.stringify(value);

        if (ttlSeconds) {
            const jitteredTTL = this.applyJitter(ttlSeconds);
            await this.client.set(key, serializedValue, "EX", jitteredTTL);
        } else {
            await this.client.set(key, serializedValue);
        }

        return value;
    }

    async setIfNotExists(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
        const serializedValue = typeof value === "string" ? value : JSON.stringify(value);
        if (ttlSeconds) {
            const res = await this.client.set(key, serializedValue, "EX", ttlSeconds, "NX");
            return res === "OK";
        }
        const res = await this.client.set(key, serializedValue, "NX");
        return res === "OK";
    }

    async del(key: string): Promise<any> {
        const deleted = await this.client.del(key);
        return deleted > 0;
    }

    async close(): Promise<void> {
        await this.client.quit();
    }
}
