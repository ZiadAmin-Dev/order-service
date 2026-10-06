import { Response } from "express";
import { PaginationMeta } from "./pagination/cursor-pagination";

export interface APIResponse<T = unknown> {
    success: boolean;
    data?: T;
    meta?: Record<string, unknown> | PaginationMeta;
    error?: string;
    message?: string;
}

export function sendSuccess<T>(
    res: Response,
    data: T,
    statusCode: number = 200,
    meta?: Record<string, unknown>
) {
    const body: APIResponse<T> = { success: true, data };
    if (meta) body.meta = meta;
    res.status(statusCode).json(body);
}

export function sendPaginated<T>(res: Response, data: T[], meta: PaginationMeta) {
    res.status(200).json({ success: true, data, meta });
}
