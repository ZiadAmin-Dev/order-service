import { AppError } from "../../lib/error/AppError";

export const transactionNotFoundError = new AppError("Transaction record not found", 404);
export const invalidWebhookSignatureError = new AppError("Invalid payment webhook signature", 401);
export const paymentAlreadyCompletedError = new AppError("Payment transaction is already completed", 409);
export const kashierGatewayError = new AppError("Error communicating with Kashier payment gateway", 502);
export const invalidPaymentAmountError = new AppError("Payment amount mismatch", 400);
