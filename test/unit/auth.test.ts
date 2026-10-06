import { describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { env } from "../../src/lib/config/env";
import { verifyAccessToken } from "../../src/lib/auth/jwt";
import { authentication } from "../../src/lib/auth/guard";
import {
    rbac,
    requireRestaurantMember,
    requireBranchAccess,
} from "../../src/lib/auth/rbac";
import { requireInternalApiKey } from "../../src/lib/auth/api-key";
import {
    notAuthenticatedError,
    hasNotThisPermissionError,
    restaurantAccessRestrictedError,
    branchAccessRestrictedError,
    invalidApiKeyError,
} from "../../src/lib/auth/errors";
import type { Request, Response } from "express";

describe("Authentication & RBAC Security Layer", () => {
    const validUserPayload = {
        userId: 42,
        email: "customer@quickbite.com",
        role: "customer",
    };

    const validToken = jwt.sign(validUserPayload, env.jwt.accessSecret, { expiresIn: "1h" });

    describe("JWT Token Verification", () => {
        it("verifies and decodes valid JWT token", () => {
            const decoded = verifyAccessToken(validToken);
            assert.equal(decoded.userId, 42);
            assert.equal(decoded.email, "customer@quickbite.com");
            assert.equal(decoded.role, "customer");
        });

        it("throws error for tampered token", () => {
            assert.throws(() => verifyAccessToken(validToken + "tampered"));
        });

        it("throws error for token signed with wrong secret", () => {
            const badToken = jwt.sign(validUserPayload, "wrong-secret");
            assert.throws(() => verifyAccessToken(badToken));
        });
    });

    describe("Authentication Guard Middleware", () => {
        it("authenticates via Authorization Bearer header", () => {
            const req: any = {
                headers: { authorization: `Bearer ${validToken}` },
                cookies: {},
            };
            let nextCalled = false;
            authentication(req as Request, {} as Response, (err) => {
                assert.equal(err, undefined);
                nextCalled = true;
            });
            assert.equal(nextCalled, true);
            assert.equal(req.user?.userId, 42);
        });

        it("authenticates via access_token cookie", () => {
            const req: any = {
                headers: {},
                cookies: { access_token: validToken },
            };
            let nextCalled = false;
            authentication(req as Request, {} as Response, (err) => {
                assert.equal(err, undefined);
                nextCalled = true;
            });
            assert.equal(nextCalled, true);
            assert.equal(req.user?.userId, 42);
        });

        it("rejects request when token is missing", () => {
            const req: any = { headers: {}, cookies: {} };
            let errorPassed: any = null;
            authentication(req as Request, {} as Response, (err) => {
                errorPassed = err;
            });
            assert.equal(errorPassed, notAuthenticatedError);
        });
    });

    describe("RBAC Permissions Middleware", () => {
        it("permits system_admin unconditionally", async () => {
            const req: any = { user: { userId: 1, role: "system_admin" } };
            const guard = rbac({ resource: "orders:order", action: "update_status" });
            let nextCalled = false;
            await guard(req as Request, {} as Response, (err) => {
                assert.equal(err, undefined);
                nextCalled = true;
            });
            assert.equal(nextCalled, true);
        });

        it("permits restaurant owner unconditionally for restaurant resources", async () => {
            const req: any = {
                user: { userId: 2, role: "restaurant_user", restaurantRole: "owner", restaurantId: 5 },
            };
            const guard = rbac({ resource: "orders:order", action: "read" });
            let nextCalled = false;
            await guard(req as Request, {} as Response, (err) => {
                assert.equal(err, undefined);
                nextCalled = true;
            });
            assert.equal(nextCalled, true);
        });

        it("permits branch_manager for allowed operational actions", async () => {
            const req: any = {
                user: { userId: 3, role: "restaurant_user", restaurantRole: "branch_manager", restaurantId: 5 },
            };
            const guard = rbac({ resource: "orders:order", action: "accept_reject" });
            let nextCalled = false;
            await guard(req as Request, {} as Response, (err) => {
                assert.equal(err, undefined);
                nextCalled = true;
            });
            assert.equal(nextCalled, true);
        });

        it("rejects branch_manager for unauthorized finance actions", async () => {
            const req: any = {
                user: { userId: 3, role: "restaurant_user", restaurantRole: "branch_manager", restaurantId: 5 },
            };
            const guard = rbac({ resource: "orders:finance", action: "view_balance" });
            let errorPassed: any = null;
            await guard(req as Request, {} as Response, (err) => {
                errorPassed = err;
            });
            assert.equal(errorPassed, hasNotThisPermissionError);
        });

        it("permits staff to read orders and update prep status", async () => {
            const req: any = {
                user: { userId: 4, role: "restaurant_user", restaurantRole: "staff", restaurantId: 5 },
            };
            const guard = rbac({ resource: "orders:order", action: "update_status" });
            let nextCalled = false;
            await guard(req as Request, {} as Response, (err) => {
                assert.equal(err, undefined);
                nextCalled = true;
            });
            assert.equal(nextCalled, true);
        });

        it("rejects staff from accepting/rejecting orders or dispatching deliveries", async () => {
            const req: any = {
                user: { userId: 4, role: "restaurant_user", restaurantRole: "staff", restaurantId: 5 },
            };
            const guard = rbac({ resource: "orders:order", action: "accept_reject" });
            let errorPassed: any = null;
            await guard(req as Request, {} as Response, (err) => {
                errorPassed = err;
            });
            assert.equal(errorPassed, hasNotThisPermissionError);
        });

        it("rejects customer from restaurant operations", async () => {
            const req: any = { user: { userId: 10, role: "customer" } };
            const guard = rbac({ resource: "orders:order", action: "update_status" });
            let errorPassed: any = null;
            await guard(req as Request, {} as Response, (err) => {
                errorPassed = err;
            });
            assert.equal(errorPassed, hasNotThisPermissionError);
        });
    });

    describe("Tenant Boundary Guards", () => {
        it("requireRestaurantMember allows matching restaurant ID", async () => {
            const req: any = {
                params: { restaurantId: "5" },
                user: { userId: 2, restaurantId: 5 },
            };
            const guard = requireRestaurantMember("restaurantId");
            let nextCalled = false;
            await guard(req as Request, {} as Response, (err) => {
                assert.equal(err, undefined);
                nextCalled = true;
            });
            assert.equal(nextCalled, true);
        });

        it("requireRestaurantMember rejects mismatched restaurant ID", async () => {
            const req: any = {
                params: { restaurantId: "10" },
                user: { userId: 2, restaurantId: 5 },
            };
            const guard = requireRestaurantMember("restaurantId");
            let errorPassed: any = null;
            await guard(req as Request, {} as Response, (err) => {
                errorPassed = err;
            });
            assert.equal(errorPassed, restaurantAccessRestrictedError);
        });

        it("requireBranchAccess allows user with matching branch ID", async () => {
            const req: any = {
                params: { branchId: "100" },
                user: { userId: 3, branchIds: [100, 101] },
            };
            const guard = requireBranchAccess("branchId");
            let nextCalled = false;
            await guard(req as Request, {} as Response, (err) => {
                assert.equal(err, undefined);
                nextCalled = true;
            });
            assert.equal(nextCalled, true);
        });

        it("requireBranchAccess rejects user without matching branch ID", async () => {
            const req: any = {
                params: { branchId: "999" },
                user: { userId: 3, branchIds: [100, 101] },
            };
            const guard = requireBranchAccess("branchId");
            let errorPassed: any = null;
            await guard(req as Request, {} as Response, (err) => {
                errorPassed = err;
            });
            assert.equal(errorPassed, branchAccessRestrictedError);
        });

        it("requireBranchAccess allows owner to access any branch", async () => {
            const req: any = {
                params: { branchId: "999" },
                user: { userId: 2, restaurantRole: "owner", branchIds: [] },
            };
            const guard = requireBranchAccess("branchId");
            let nextCalled = false;
            await guard(req as Request, {} as Response, (err) => {
                assert.equal(err, undefined);
                nextCalled = true;
            });
            assert.equal(nextCalled, true);
        });
    });

    describe("Internal Service API Key Guard", () => {
        it("allows valid internal API key header", () => {
            const req: any = {
                headers: { "x-internal-api-key": env.coreService.internalApiKey },
            };
            let nextCalled = false;
            requireInternalApiKey(req as Request, {} as Response, (err) => {
                assert.equal(err, undefined);
                nextCalled = true;
            });
            assert.equal(nextCalled, true);
        });

        it("rejects missing or wrong internal API key", () => {
            const req: any = { headers: { "x-internal-api-key": "invalid-key" } };
            let errorPassed: any = null;
            requireInternalApiKey(req as Request, {} as Response, (err) => {
                errorPassed = err;
            });
            assert.equal(errorPassed, invalidApiKeyError);
        });
    });
});
