import jwt from "jsonwebtoken";
import { env } from "../config/env";
import {notAuthenticatedError} from "./errors";

export interface JwtPayload {
    userId: number;
    email: string;
    role: string;
    restaurantId?: number;
    restaurantRole?: string;
    branchIds?: number[];
}

export function verifyAccessToken(token: string): JwtPayload {
    try {
        return jwt.verify(token, env.jwt.accessSecret) as JwtPayload;
    } catch {
        throw notAuthenticatedError;
    }
}

export function verifyRefreshToken(token: string): JwtPayload {
    try {
        return jwt.verify(token, env.jwt.refreshSecret) as JwtPayload;
    } catch {
        throw notAuthenticatedError;
    }
}