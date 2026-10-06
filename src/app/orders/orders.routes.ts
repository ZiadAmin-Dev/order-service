import { Router } from "express";
import { container } from "../../lib/di/container";
import { TOKENS } from "../../lib/di/tokens";
import { OrderController } from "./controller/order.controller";
import { authentication } from "../../lib/auth/guard";
import { rbac, requireBranchAccess } from "../../lib/auth/rbac";
import { idempotency } from "../../lib/idempotency/idempotency";

export const ordersRouter = Router();

// Lazy or eager resolve of controller
const orderController = container.resolve<OrderController>(TOKENS.OrderController);

// Customer endpoints
ordersRouter.post(
    "/",
    authentication,
    idempotency({ strict: false }),
    orderController.create
);

ordersRouter.get("/my-orders", authentication, orderController.getMyOrders);
ordersRouter.get("/:publicId", authentication, orderController.getByPublicId);
ordersRouter.patch("/:publicId/cancel", authentication, orderController.cancelMyOrder);

// Restaurant & branch endpoints
ordersRouter.patch(
    "/:publicId/status",
    authentication,
    rbac({ resource: "orders:order", action: "update_status" }),
    orderController.updateStatus
);

// List orders (filter by branchId, status, cursor)
ordersRouter.get(
    "/",
    authentication,
    requireBranchAccess("branchId"),
    rbac({ resource: "orders:order", action: "read" }),
    orderController.getBranchOrders
);

ordersRouter.get(
    "/branch/:branchId",
    authentication,
    requireBranchAccess("branchId"),
    rbac({ resource: "orders:order", action: "read" }),
    orderController.getBranchOrders
);
