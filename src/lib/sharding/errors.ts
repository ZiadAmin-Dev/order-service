import { AppError } from "../error/AppError";

export const invalidRegionError = new AppError("Invalid or unsupported region specified", 400);
export const missingRegionError = new AppError("Region must be specified", 400);
