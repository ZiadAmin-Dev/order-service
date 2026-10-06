import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { invalidApiKeyError } from "./errors";

export function requireInternalApiKey(req: Request, _res: Response, next: NextFunction) {
    const key =
        (req.headers["x-internal-api-key"] as string) ||
        (req.headers["api-key"] as string);

    if (!key || key !== env.coreService.internalApiKey) {
        return next(invalidApiKeyError);
    }

    next();
}
