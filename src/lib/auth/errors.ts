import { AppError } from "../error/AppError";

export const notAuthenticatedError = new AppError("Authentication required", 401);
export const hasNotThisPermissionError = new AppError("You do not have permission to perform this action", 403);
export const restaurantAccessRestrictedError = new AppError("Access restricted to assigned restaurant", 403);
export const branchAccessRestrictedError = new AppError("Access restricted to assigned branches", 403);
export const invalidOrMissingError = new AppError("Invalid or missing resource identifier", 400);
export const invalidApiKeyError = new AppError("Invalid or missing internal API key", 401);
