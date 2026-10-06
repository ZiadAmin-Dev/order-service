import { Router } from "express";
import { container } from "../../lib/di/container";
import { TOKENS } from "../../lib/di/tokens";
import { DeliveryController } from "./controller/delivery.controller";
import { authentication } from "../../lib/auth/guard";
import { rbac } from "../../lib/auth/rbac";

export const deliveriesRouter = Router();

const deliveryController = container.resolve<DeliveryController>(TOKENS.DeliveryController);

// Restaurant / Admin manual dispatch
deliveriesRouter.post(
    "/:orderPublicId/assign",
    authentication,
    rbac({ resource: "orders:delivery", action: "manual_assign" }),
    deliveryController.assign
);

// Delivery agent operations
deliveriesRouter.patch("/:orderPublicId/pickup", authentication, deliveryController.pickup);
deliveriesRouter.patch("/:orderPublicId/delivered", authentication, deliveryController.delivered);
