import { Request, Response, NextFunction } from "express";
import {
    branchAccessRestrictedError,
    hasNotThisPermissionError,
    invalidOrMissingError,
    notAuthenticatedError,
    restaurantAccessRestrictedError,
} from "./errors";

export interface RBACOptions {
    resource: string;
    action: string;
    allowSystemAdmin?: boolean;
}

export function rbac(options: RBACOptions) {
    return async (req: Request, _res: Response, next: NextFunction) => {
        try {
            if (!req.user) return next(notAuthenticatedError);
            const { resource, action, allowSystemAdmin = true } = options;

            // System admin bypasses checks
            if (allowSystemAdmin && req.user.role === "system_admin") {
                return next();
            }

            // Restaurant Owner has full access to their restaurant
            if (req.user.restaurantRole === "owner") {
                return next();
            }

            // Branch manager role permissions
            if (req.user.restaurantRole === "branch_manager") {
                const bmAllowed = [
                    "orders:order:read",
                    "orders:order:accept_reject",
                    "orders:order:update_status",
                    "orders:delivery:manual_assign",
                ];
                if (bmAllowed.includes(`${resource}:${action}`)) {
                    return next();
                }
            }

            // Staff role permissions
            if (req.user.restaurantRole === "staff") {
                const staffAllowed = [
                    "orders:order:read",
                    "orders:order:update_status",
                ];
                if (staffAllowed.includes(`${resource}:${action}`)) {
                    return next();
                }
            }

            return next(hasNotThisPermissionError);
        } catch (err) {
            next(err);
        }
    };
}

export function requireRestaurantMember(paramName: string = "restaurantId") {
    return async (req: Request, _res: Response, next: NextFunction) => {
        try {
            const rawId = req.params[paramName] || req.body?.[paramName] || req.query?.[paramName];
            const restaurantId = parseInt(rawId as string);
            if (!restaurantId || isNaN(restaurantId)) return next(invalidOrMissingError);

            if (req.user?.role === "system_admin") return next();

            if (Number(req.user?.restaurantId) !== restaurantId) {
                return next(restaurantAccessRestrictedError);
            }

            next();
        } catch (err) {
            next(err);
        }
    };
}

export function requireBranchAccess(paramName: string = "branchId") {
    return async (req: Request, _res: Response, next: NextFunction) => {
        try {
            if (req.user?.role === "system_admin" || req.user?.restaurantRole === "owner") {
                return next();
            }

            const rawId = req.params[paramName] || req.body?.[paramName] || req.query?.[paramName];
            const branchId = parseInt(rawId as string);
            if (!branchId) return next();

            const userBranchIds = req.user?.branchIds || [];
            if (!userBranchIds.includes(branchId)) {
                return next(branchAccessRestrictedError);
            }

            next();
        } catch (err) {
            next(err);
        }
    };
}
