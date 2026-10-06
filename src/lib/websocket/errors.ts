import { AppError } from "../error/AppError";

export const wsAuthenticationError = new AppError("WebSocket authentication failed", 401);
export const wsRoomUnauthorizedError = new AppError("Unauthorized room subscription", 403);
