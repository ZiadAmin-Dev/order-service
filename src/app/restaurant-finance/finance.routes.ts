import { Router } from "express";
import { container } from "../../lib/di/container";
import { TOKENS } from "../../lib/di/tokens";
import { FinanceController } from "./controller/finance.controller";
import { authentication } from "../../lib/auth/guard";
import { rbac, requireRestaurantMember } from "../../lib/auth/rbac";
import { idempotency } from "../../lib/idempotency/idempotency";

export const financeRouter = Router();

const financeController = container.resolve<FinanceController>(TOKENS.FinanceController);

financeRouter.get(
    "/restaurants/:restaurantId/balance",
    authentication,
    requireRestaurantMember("restaurantId"),
    rbac({ resource: "orders:finance", action: "view_balance" }),
    financeController.getBalance
);

financeRouter.post(
    "/restaurants/:restaurantId/payouts",
    authentication,
    rbac({ resource: "orders:finance", action: "view_payouts" }),
    idempotency({ strict: false }),
    financeController.createPayout
);
