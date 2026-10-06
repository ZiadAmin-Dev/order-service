import { Request, Response, NextFunction } from "express";
import { ICacheProvider } from "../../pkg/cache/cache.interface";
import { container } from "../di/container";
import { TOKENS } from "../di/tokens";
import { toSec } from "../../pkg/utils/time";
import { db } from "../knex/knex";

const TTL = toSec(1, "d");

interface IdempotencyOptions {
    strict?: boolean;
}

export function idempotency(options: IdempotencyOptions = {}) {
    const { strict = false } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
        if (!["POST", "PUT", "PATCH"].includes(req.method)) {
            return next();
        }

        const idempotencyKey =
            (req.headers["idempotency-key"] as string | undefined) ||
            (req.headers["idempotency_key"] as string | undefined);

        if (!idempotencyKey) {
            if (strict) {
                return res.status(400).json({
                    success: false,
                    error: "Missing Idempotency-Key header",
                });
            }
            return next();
        }

        const region = req.region || "eg";
        const key = `idempotency:${region}:${req.method}:${req.originalUrl}:${idempotencyKey}`;

        try {
            // 1. Fast Layer: Redis Cache Check
            const cacheProvider: ICacheProvider = container.resolve(TOKENS.CacheProvider);
            let cached = await cacheProvider.get(key).catch(() => null);

            if (cached) {
                res.setHeader("X-Idempotent-Replay", "true");
                const body = typeof cached === "string" ? JSON.parse(cached) : cached;
                return res.status(200).json(body);
            }

            // 2. Durable Layer: PostgreSQL DB Check Fallback
            try {
                const conn = db(region);
                const dbRow = await conn("idempotency_keys")
                    .where("key", idempotencyKey)
                    .first();

                if (dbRow && new Date(dbRow.expires_at) > new Date()) {
                    res.setHeader("X-Idempotent-Replay", "true");
                    return res.status(dbRow.status_code).json(dbRow.response_body);
                }
            } catch {
                // Ignore DB error and continue if DB is unavailable
            }

            const originalJson = res.json.bind(res);

            res.json = (body: any) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const serialized = typeof body === "string" ? body : JSON.stringify(body);
                    const parsedBody = typeof body === "string" ? JSON.parse(body) : body;

                    // Save to Redis (Fast)
                    cacheProvider.set(key, serialized, TTL).catch((err) => {
                        console.error("Failed to set idempotency cache:", err);
                    });

                    // Save to PostgreSQL (Durable)
                    try {
                        const conn = db(region);
                        conn("idempotency_keys")
                            .insert({
                                key: idempotencyKey,
                                method: req.method,
                                path: req.originalUrl,
                                request_hash: "",
                                status_code: res.statusCode,
                                response_body: parsedBody,
                                created_at: new Date(),
                                expires_at: new Date(Date.now() + TTL * 1000),
                            })
                            .onConflict("key")
                            .ignore()
                            .catch(() => {});
                    } catch {}
                }
                return originalJson(body);
            };

            next();
        } catch {
            if (strict) {
                return res.status(503).json({
                    success: false,
                    error: "Idempotency service unavailable",
                });
            }
            next();
        }
    };
}
