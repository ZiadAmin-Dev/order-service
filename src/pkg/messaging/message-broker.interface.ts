export interface MessageContext {
    routingKey: string;
    correlationId?: string;
    ack: () => void;
    nack: (requeue?: boolean) => void;
}

export interface IMessageBroker {
    connect(): Promise<void>;
    consume(
        queue: string,
        handler: (payload: any, ctx: MessageContext) => Promise<void>
    ): Promise<void>;
    close(): Promise<void>;
}
