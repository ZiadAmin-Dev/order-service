import { Request, Response, NextFunction } from "express";
import { ICacheProvider } from "../../pkg/cache/cache.interface";
import { container } from "../di/container";
import { TOKENS } from "../di/tokens";
import { toSec } from "../../pkg/utils/time";

export function withCache(ttlSeconds = toSec(1, "h"), userScoped = false) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const cache: ICacheProvider = container.resolve(TOKENS.CacheProvider);
            const region = req.region || "eg";
            let key = `cache:${region}:${req.method}:${req.originalUrl}`;

            if (userScoped && req.user?.userId) {
                key = `${key}:${req.user.userId}`;
            }

            const cached = await cache.get(key);
            if (cached) {
                res.setHeader("X-Cache", "HIT");
                const data = typeof cached === "string" ? JSON.parse(cached) : cached;
                return res.status(200).json(data);
            }

            res.setHeader("X-Cache", "MISS");
            const originalJson = res.json.bind(res);

            res.json = (body: any) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const valueToCache = typeof body === "string" ? body : JSON.stringify(body);
                    cache.set(key, valueToCache, ttlSeconds).catch((err) => {
                        console.error("Cache set error:", err);
                    });
                }
                return originalJson(body);
            };

            next();
        } catch (err) {
            console.error("Cache middleware error, falling back to handler:", err);
            next();
        }
    };
}
