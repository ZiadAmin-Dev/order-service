import "reflect-metadata";
import { container } from "tsyringe";
import { TOKENS } from "./tokens";
import { Logger, logger } from "../logger/logger";
import { env } from "../config/env";

// Infrastructure Providers
import { cacheProvider } from "../cache/init";
import { RabbitMQClient } from "../../pkg/messaging/rabbitmq/rabbitmq.client";
import { KashierClient } from "../../pkg/payments/kashier";
import { CoreClient } from "../core-client/core-client";
import { wsGateway } from "../websocket/ws-server";

// Services
import { OrderService } from "../../app/orders/service/order.service";
import { PaymentService } from "../../app/payments/service/payment.service";
import { DeliveryService } from "../../app/deliveries/service/delivery.service";
import { AgentService } from "../../app/agents/service/agent.service";
import { FinanceService } from "../../app/restaurant-finance/service/finance.service";

// Controllers
import { OrderController } from "../../app/orders/controller/order.controller";
import { PaymentController } from "../../app/payments/controller/payment.controller";
import { DeliveryController } from "../../app/deliveries/controller/delivery.controller";
import { AgentController } from "../../app/agents/controller/agent.controller";
import { FinanceController } from "../../app/restaurant-finance/controller/finance.controller";

// 1. Register Infrastructure Providers
container.registerInstance(TOKENS.Logger, logger);
container.registerInstance(TOKENS.CacheProvider, cacheProvider);

const rabbitClient = new RabbitMQClient({
    url: env.rabbitmq.url,
    prefetch: env.rabbitmq.prefetch,
    exchange: env.rabbitmq.exchange,
    queue: env.rabbitmq.queue,
    bindings: env.rabbitmq.bindings,
    dlx: env.rabbitmq.dlx,
    dlq: env.rabbitmq.dlq,
});
container.registerInstance(TOKENS.MessageBroker, rabbitClient);

const kashierClient = new KashierClient({
    apiKey: env.kashier.apiKey,
    secretKey: env.kashier.secretKey,
    merchantId: env.kashier.merchantId,
    baseUrl: env.kashier.baseUrl,
});
container.registerInstance(TOKENS.KashierClient, kashierClient);

const coreClient = new CoreClient(cacheProvider);
container.registerInstance(TOKENS.CoreClient, coreClient);

container.registerInstance(TOKENS.WebSocketGateway, wsGateway);

// 2. Register Domain Services
container.registerSingleton<OrderService>(TOKENS.OrderService, OrderService);
container.registerSingleton<PaymentService>(TOKENS.PaymentService, PaymentService);
container.registerSingleton<DeliveryService>(TOKENS.DeliveryService, DeliveryService);
container.registerSingleton<AgentService>(TOKENS.AgentService, AgentService);
container.registerSingleton<FinanceService>(TOKENS.FinanceService, FinanceService);

// 3. Register Domain Controllers
container.registerSingleton<OrderController>(TOKENS.OrderController, OrderController);
container.registerSingleton<PaymentController>(TOKENS.PaymentController, PaymentController);
container.registerSingleton<DeliveryController>(TOKENS.DeliveryController, DeliveryController);
container.registerSingleton<AgentController>(TOKENS.AgentController, AgentController);
container.registerSingleton<FinanceController>(TOKENS.FinanceController, FinanceController);

export { container };
