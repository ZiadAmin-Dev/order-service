import { describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { env } from "../../src/lib/config/env";
import { authenticateWebSocket } from "../../src/lib/websocket/ws-auth";
import type { IncomingMessage } from "http";

describe("WebSocket Gateway & Authentication", () => {
    it("authenticates socket via query ?token= and populates authorized customer rooms", () => {
        const token = jwt.sign(
            { userId: 42, role: "customer", email: "cust@quickbite.com" },
            env.jwt.accessSecret
        );

        const req: any = {
            url: `/ws?token=${token}`,
            headers: {},
        };

        const auth = authenticateWebSocket(req as IncomingMessage);
        assert.ok(auth);
        assert.equal(auth.user.userId, 42);
        assert.ok(auth.authorizedRooms.has("customer:42"));
        assert.ok(!auth.authorizedRooms.has("admin:all"));
    });

    it("populates delivery agent rooms for delivery_agent role", () => {
        const token = jwt.sign(
            { userId: 77, role: "delivery_agent", email: "driver@quickbite.com" },
            env.jwt.accessSecret
        );

        const req: any = {
            url: `/ws?token=${token}`,
            headers: {},
        };

        const auth = authenticateWebSocket(req as IncomingMessage);
        assert.ok(auth);
        assert.ok(auth.authorizedRooms.has("customer:77"));
        assert.ok(auth.authorizedRooms.has("agent:77"));
    });

    it("populates restaurant and branch rooms for restaurant staff", () => {
        const token = jwt.sign(
            {
                userId: 9,
                role: "restaurant_user",
                restaurantRole: "branch_manager",
                restaurantId: 2,
                branchIds: [10, 11],
                email: "manager@quickbite.com",
            },
            env.jwt.accessSecret
        );

        const req: any = {
            url: `/ws?token=${token}`,
            headers: {},
        };

        const auth = authenticateWebSocket(req as IncomingMessage);
        assert.ok(auth);
        assert.ok(auth.authorizedRooms.has("restaurant:2"));
        assert.ok(auth.authorizedRooms.has("branch:10"));
        assert.ok(auth.authorizedRooms.has("branch:11"));
    });

    it("populates admin:all room for system_admin", () => {
        const token = jwt.sign(
            { userId: 1, role: "system_admin", email: "admin@quickbite.com" },
            env.jwt.accessSecret
        );

        const req: any = {
            url: `/ws?token=${token}`,
            headers: {},
        };

        const auth = authenticateWebSocket(req as IncomingMessage);
        assert.ok(auth);
        assert.ok(auth.authorizedRooms.has("admin:all"));
    });

    it("rejects socket connection with invalid or missing token", () => {
        const reqMissing: any = { url: "/ws", headers: {} };
        assert.equal(authenticateWebSocket(reqMissing as IncomingMessage), null);

        const reqInvalid: any = { url: "/ws?token=bad-token", headers: {} };
        assert.equal(authenticateWebSocket(reqInvalid as IncomingMessage), null);
    });
});
