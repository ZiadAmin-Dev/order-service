import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./lib/config/env";
import { correlationId } from "./lib/correlation/correlationId";
import { regionResolver } from "./lib/sharding/region-resolver";
import { routes } from "./routes";
import { errorHandler } from "./lib/error/errorHandler";

export function createApp(): express.Application {
    const app = express();

    app.use(helmet());
    app.use(cors({ origin: env.cors.origins, credentials: true }));
    app.set("query parser", "extended");
    app.use(express.json({ limit: "10mb" }));
    app.use(cookieParser());
    app.use(correlationId);
    app.use(regionResolver);

    app.use("/api", routes);

    app.use(errorHandler);

    return app;
}
