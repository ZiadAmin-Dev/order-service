import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { idempotency } from "../../src/lib/idempotency/idempotency";
import { container } from "../../src/lib/di/container";
import { TOKENS } from "../../src/lib/di/tokens";
import { ICacheProvider } from "../../src/pkg/cache/cache.interface";
import type { Request, Response } from "express";

class MemoryCache implements ICacheProvider {
    private store = new Map<string, any>();
    async get(key: string): Promise<any> {
        return this.store.get(key) || null;
    }
    async set(key: string, value: any): Promise<any> {
        this.store.set(key, value);
        return value;
    }
    async del(key: string): Promise<boolean> {
        return this.store.delete(key);
    }
}

describe("Idempotency Middleware", () => {
    let mockCache: MemoryCache;

    before(() => {
        mockCache = new MemoryCache();
        container.registerInstance(TOKENS.CacheProvider, mockCache);
    });

    it("bypasses non-mutating GET requests without idempotency check", async () => {
        const mw = idempotency({ strict: true });
        const req: any = { method: "GET", headers: {} };
        let nextCalled = false;

        await mw(req as Request, {} as Response, () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, true);
    });

    it("rejects mutating request when strict is true and Idempotency-Key is missing", async () => {
        const mw = idempotency({ strict: true });
        const req: any = { method: "POST", headers: {} };

        let statusCode = 0;
        let responseJson: any = null;
        const res: any = {
            status: (code: number) => {
                statusCode = code;
                return {
                    json: (body: any) => {
                        responseJson = body;
                    },
                };
            },
        };

        await mw(req as Request, res as Response, () => {});

        assert.equal(statusCode, 400);
        assert.equal(responseJson?.success, false);
        assert.equal(responseJson?.error, "Missing Idempotency-Key header");
    });

    it("replays cached response with X-Idempotent-Replay header", async () => {
        const testKey = "idempotency:eg:POST:/api/orders:test-uuid-key";
        const cachedBody = { success: true, data: { orderId: 100 } };
        await mockCache.set(testKey, JSON.stringify(cachedBody));

        const mw = idempotency({ strict: true });
        const req: any = {
            method: "POST",
            originalUrl: "/api/orders",
            region: "eg",
            headers: { "idempotency-key": "test-uuid-key" },
        };

        const headersSent: Record<string, string> = {};
        let responseCode = 0;
        let responseData: any = null;

        const res: any = {
            setHeader: (name: string, val: string) => {
                headersSent[name] = val;
            },
            status: (code: number) => {
                responseCode = code;
                return {
                    json: (body: any) => {
                        responseData = body;
                    },
                };
            },
        };

        await mw(req as Request, res as Response, () => {});

        assert.equal(headersSent["X-Idempotent-Replay"], "true");
        assert.equal(responseCode, 200);
        assert.deepEqual(responseData, cachedBody);
    });
});
