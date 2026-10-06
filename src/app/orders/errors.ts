import { AppError } from "../../lib/error/AppError";

export const orderNotFoundError = new AppError("Order not found", 404);
export const invalidOrderStatusTransitionError = new AppError("Invalid order status transition", 409);
export const orderAlreadyAcceptedError = new AppError("Order has already been accepted and cannot be cancelled", 409);
export const unauthorizedOrderActionError = new AppError("Unauthorized action on this order", 403);
export const orderItemsRequiredError = new AppError("Order must contain at least one item", 400);
export const branchNotAcceptingOrdersError = new AppError("Restaurant branch is currently not accepting orders", 400);
export const addressOutOfDeliveryRangeError = new AppError("Delivery address is outside branch delivery range", 400);
