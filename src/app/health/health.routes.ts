import { Router, Request, Response } from "express";
import { pingDB } from "../../lib/knex/knex";

export const healthRouter = Router();

healthRouter.get("/", async (_req: Request, res: Response) => {
    try {
        await pingDB().catch(() => {});
        res.status(200).json({
            status: "ok",
            service: "order-service",
            timestamp: new Date().toISOString(),
        });
    } catch {
        res.status(200).json({
            status: "degraded",
            service: "order-service",
            timestamp: new Date().toISOString(),
        });
    }
});
