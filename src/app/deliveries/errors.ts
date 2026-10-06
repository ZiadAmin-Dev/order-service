import { AppError } from "../../lib/error/AppError";

export const deliveryNotFoundError = new AppError("Delivery task not found", 404);
export const deliveryAlreadyAssignedError = new AppError("Delivery has already been assigned to an agent", 409);
export const agentNotAvailableError = new AppError("Selected delivery agent is not available", 400);
export const unauthorizedDeliveryActionError = new AppError("Unauthorized action on delivery task", 403);
export const invalidDeliveryStateTransitionError = new AppError("Invalid delivery state transition", 409);
