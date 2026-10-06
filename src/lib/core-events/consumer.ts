import { IMessageBroker, MessageContext } from "../../pkg/messaging/message-broker.interface";
import { ICacheProvider } from "../../pkg/cache/cache.interface";
import { logger } from "../logger/logger";
import { env } from "../config/env";

export class CoreEventsConsumer {
    private readonly broker: IMessageBroker;
    private readonly cache: ICacheProvider;

    constructor(broker: IMessageBroker, cache: ICacheProvider) {
        this.broker = broker;
        this.cache = cache;
    }

    async start(): Promise<void> {
        try {
            await this.broker.consume(
                env.rabbitmq.queue,
                async (payload: any, ctx: MessageContext) => {
                    await this.handleMessage(payload, ctx);
                }
            );
        } catch (err) {
            logger.warn("Core events consumer start warning:", { error: (err as Error).message });
        }
    }

    private async handleMessage(payload: any, ctx: MessageContext): Promise<void> {
        const eventId = payload?.eventId || `${ctx.routingKey}_${Date.now()}`;
        const dedupeKey = `core-events:dedupe:${eventId}`;

        // Deduplicate using Redis SETNX (24h TTL)
        if (this.cache.setIfNotExists) {
            const isFresh = await this.cache.setIfNotExists(dedupeKey, "1", 86400);
            if (!isFresh) {
                ctx.ack();
                return;
            }
        }

        try {
            const routingKey = ctx.routingKey;

            if (routingKey.startsWith("product.")) {
                const productId = payload.productId;
                if (productId) await this.cache.del(`core:product:${productId}`);
            } else if (routingKey.startsWith("branch.")) {
                const branchId = payload.branchId;
                if (branchId) await this.cache.del(`core:branch:${branchId}`);
            } else if (routingKey.startsWith("restaurant.")) {
                const restaurantId = payload.restaurantId;
                if (restaurantId) await this.cache.del(`core:restaurant:${restaurantId}`);
            } else if (routingKey.startsWith("rbac.")) {
                const role = payload.role;
                if (role) await this.cache.del(`core:rbac:perms:${role}`);
            }

            ctx.ack();
        } catch (err) {
            logger.error("Error processing core event:", {
                routingKey: ctx.routingKey,
                error: (err as Error).message,
            });
            ctx.nack(false);
        }
    }
}
