import type { Request, Response, NextFunction } from "express";
import { logger } from "../logger/logger";
import { AppError } from "./AppError";

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
    const operational = err instanceof AppError ? err.isOperational : false;
    const statusCode = err instanceof AppError ? err.statusCode : (err.status || 500);

    logger.error(err.message || "Unhandled error", {
        statusCode,
        stack: err.stack,
        operational,
        path: req.originalUrl,
        method: req.method,
        body: req.body,
        correlationId: req.correlationId,
        region: req.region,
    });

    if (operational) {
        return res.status(statusCode).json({
            success: false,
            error: err.message,
        });
    }

    return res.status(500).json({
        success: false,
        error: "Internal server error",
    });
}
