import { AppError } from "../../lib/error/AppError";

export const restaurantBalanceNotFoundError = new AppError("Restaurant balance record not found", 404);
export const insufficientBalanceError = new AppError("Insufficient balance for requested payout", 400);
export const invalidPayoutAmountError = new AppError("Payout amount must be greater than zero", 400);
