import { Request, Response, NextFunction } from "express";
import { notAuthenticatedError } from "./errors";
import { verifyAccessToken } from "./jwt";

export function authentication(req: Request, _res: Response, next: NextFunction) {
    let token = req.cookies?.access_token;
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return next(notAuthenticatedError);
    }

    try {
        const payload = verifyAccessToken(token);
        req.user = payload;
        next();
    } catch {
        return next(notAuthenticatedError);
    }
}
