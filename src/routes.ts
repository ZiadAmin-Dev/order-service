import { Router } from "express";
import { healthRouter } from "./app/health/health.routes";
import { ordersRouter } from "./app/orders/orders.routes";
import { paymentsRouter } from "./app/payments/payments.routes";
import { deliveriesRouter } from "./app/deliveries/deliveries.routes";
import { agentsRouter } from "./app/agents/agents.routes";
import { financeRouter } from "./app/restaurant-finance/finance.routes";

export const routes = Router();

routes.use("/health", healthRouter);
routes.use("/orders", ordersRouter);
routes.use("/payments", paymentsRouter);
routes.use("/deliveries", deliveriesRouter);
routes.use("/agents", agentsRouter);
routes.use("/finance", financeRouter);
