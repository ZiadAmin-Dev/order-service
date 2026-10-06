export const TOKENS = {
    // Infrastructure & Providers
    Logger: Symbol.for("Logger"),
    CacheProvider: Symbol.for("CacheProvider"),
    MessageBroker: Symbol.for("MessageBroker"),
    KashierClient: Symbol.for("KashierClient"),
    CoreClient: Symbol.for("CoreClient"),
    WebSocketGateway: Symbol.for("WebSocketGateway"),

    // Services
    OrderService: Symbol.for("OrderService"),
    PaymentService: Symbol.for("PaymentService"),
    DeliveryService: Symbol.for("DeliveryService"),
    AgentService: Symbol.for("AgentService"),
    FinanceService: Symbol.for("FinanceService"),

    // Controllers
    OrderController: Symbol.for("OrderController"),
    PaymentController: Symbol.for("PaymentController"),
    DeliveryController: Symbol.for("DeliveryController"),
    AgentController: Symbol.for("AgentController"),
    FinanceController: Symbol.for("FinanceController"),
};
