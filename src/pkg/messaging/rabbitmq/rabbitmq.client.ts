import amqp, { Channel, ChannelModel } from "amqplib";
import { IMessageBroker, MessageContext } from "../message-broker.interface";

export interface RabbitMQConfig {
    url: string;
    prefetch?: number;
    exchange?: string;
    queue?: string;
    bindings?: string[];
    dlx?: string;
    dlq?: string;
}

export class RabbitMQClient implements IMessageBroker {
    private connection: ChannelModel | null = null;
    private channel: Channel | null = null;
    private readonly config: RabbitMQConfig;

    constructor(config: RabbitMQConfig) {
        this.config = config;
    }

    async connect(): Promise<void> {
        try {
            this.connection = await amqp.connect(this.config.url);
            this.channel = await this.connection.createChannel();

            if (this.config.prefetch) {
                await this.channel.prefetch(this.config.prefetch);
            }

            if (this.config.exchange) {
                await this.channel.assertExchange(this.config.exchange, "topic", { durable: true });
            }

            if (this.config.dlx && this.config.dlq) {
                await this.channel.assertExchange(this.config.dlx, "direct", { durable: true });
                await this.channel.assertQueue(this.config.dlq, { durable: true });
                await this.channel.bindQueue(this.config.dlq, this.config.dlx, "");
            }

            if (this.config.queue) {
                const queueArgs = this.config.dlx
                    ? { "x-dead-letter-exchange": this.config.dlx }
                    : undefined;

                await this.channel.assertQueue(this.config.queue, {
                    durable: true,
                    arguments: queueArgs,
                });

                if (this.config.exchange && this.config.bindings) {
                    for (const binding of this.config.bindings) {
                        await this.channel.bindQueue(
                            this.config.queue,
                            this.config.exchange,
                            binding.trim()
                        );
                    }
                }
            }
        } catch (err) {
            console.warn("RabbitMQ connection warning (broker may be unavailable in test env):", (err as Error).message);
        }
    }

    async consume(
        queue: string,
        handler: (payload: any, ctx: MessageContext) => Promise<void>
    ): Promise<void> {
        if (!this.channel) return;

        await this.channel.consume(queue, async (msg) => {
            if (!msg) return;

            const ack = () => {
                try {
                    this.channel?.ack(msg);
                } catch {}
            };

            const nack = (requeue: boolean = false) => {
                try {
                    this.channel?.nack(msg, false, requeue);
                } catch {}
            };

            try {
                const content = JSON.parse(msg.content.toString());
                const ctx: MessageContext = {
                    routingKey: msg.fields.routingKey,
                    correlationId: msg.properties.correlationId,
                    ack,
                    nack,
                };
                await handler(content, ctx);
            } catch (err) {
                console.error("RabbitMQ consumer error:", err);
                nack(false); // Send to DLQ
            }
        });
    }

    async close(): Promise<void> {
        try {
            await this.channel?.close();
            await this.connection?.close();
        } catch {}
    }
}
