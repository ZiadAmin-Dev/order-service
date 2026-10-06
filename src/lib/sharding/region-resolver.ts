import { Request, Response, NextFunction } from "express";
import { DEFAULT_REGION, isValidRegion } from "./regions";
import { invalidRegionError } from "./errors";

export function regionResolver(req: Request, _res: Response, next: NextFunction) {
    const rawRegion =
        (req.query.region as string) ||
        (req.headers["x-region"] as string) ||
        req.cookies?.region ||
        DEFAULT_REGION;

    const normalized = rawRegion.trim().toLowerCase();

    // Allow "all" for global admin fan-out queries
    if (normalized === "all" || isValidRegion(normalized)) {
        req.region = normalized;
        return next();
    }

    return next(invalidRegionError);
}
