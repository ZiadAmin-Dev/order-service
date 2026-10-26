import "reflect-metadata";
import http from "http";
import { createApp } from "./app";
import { env } from "./lib/config/env";
import { destroyAll } from "./lib/knex/knex";
import { cacheProvider } from "./lib/cache/init";
import { attachWsServer } from "./lib/websocket/ws-server";
import { logger } from "./lib/logger/logger";
import { container } from "./lib/di/container";
import { TOKENS } from "./lib/di/tokens";
import { IMessageBroker } from "./pkg/messaging/message-broker.interface";
import { startCoreEventsConsumer } from "./lib/core-events/consumer";

const app = createApp();
const server = http.createServer(app);

// Attach real-time WebSocket gateway
attachWsServer(server);

// Start RabbitMQ consumer for core-service events
const broker = container.resolve<IMessageBroker>(TOKENS.MessageBroker);
if (broker && typeof broker.connect === "function") {
    broker.connect().then(() => {
        startCoreEventsConsumer(broker).catch((err) => {
            logger.warn("Core events consumer start warning:", { error: (err as Error).message });
        });
    }).catch((err) => {
        logger.warn("RabbitMQ connection warning at boot:", { error: (err as Error).message });
    });
}

server.listen(env.port, () => {
    logger.info(`order-service running on port ${env.port} in ${env.isProduction ? "production" : "development"} mode`, {
        port: env.port,
        regions: env.regions,
    });
});

async function shutdown() {
    logger.info("Shutdown signal received. Commencing graceful termination...");

    const forceExitTimeout = setTimeout(() => {
        logger.error("Forced process termination due to shutdown timeout");
        process.exit(1);
    }, 10000);

    server.close(async () => {
        logger.info("HTTP server closed. Terminating external connections...");
        try {
            await destroyAll();
            await cacheProvider.close().catch(() => {});
            if (broker && typeof broker.close === "function") {
                await broker.close().catch(() => {});
            }
            logger.info("All connections closed cleanly.");
            clearTimeout(forceExitTimeout);
            process.exit(0);
        } catch (err) {
            logger.error("Error during graceful shutdown:", { error: (err as Error).message });
            clearTimeout(forceExitTimeout);
            process.exit(1);
        }
    });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
