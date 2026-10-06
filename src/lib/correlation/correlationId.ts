import type { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

export function correlationId(req: Request, res: Response, next: NextFunction) {
    const existing = req.headers["x-correlation-id"] as string | undefined;
    req.correlationId = existing || uuidv4();
    res.setHeader("X-Correlation-Id", req.correlationId);
    next();
}
