import { Router } from "express";
import { container } from "../../lib/di/container";
import { TOKENS } from "../../lib/di/tokens";
import { PaymentController } from "./controller/payment.controller";
import { authentication } from "../../lib/auth/guard";
import { idempotency } from "../../lib/idempotency/idempotency";

export const paymentsRouter = Router();

const paymentController = container.resolve<PaymentController>(TOKENS.PaymentController);

paymentsRouter.post(
    "/init",
    authentication,
    idempotency({ strict: false }),
    paymentController.initPayment
);

// Public webhook endpoint from payment gateway
paymentsRouter.post("/webhook", paymentController.handleWebhook);
