import { AppError } from "../error/AppError";

export const coreServiceUnavailableError = new AppError("Core service currently unavailable", 503);
export const branchNotFoundError = new AppError("Restaurant branch not found or inactive", 404);
export const addressNotFoundError = new AppError("Delivery address not found or invalid", 404);
export const invalidProductSelectionError = new AppError("One or more selected products are unavailable", 400);
