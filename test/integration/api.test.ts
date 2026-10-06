import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "http";
import jwt from "jsonwebtoken";
import { createApp } from "../../src/app";
import { env } from "../../src/lib/config/env";

describe("API HTTP Integration End-to-End Suite", () => {
    let server: http.Server;
    let baseUrl: string;

    const customerToken = jwt.sign(
        { userId: 42, role: "customer", email: "cust@quickbite.com" },
        env.jwt.accessSecret
    );

    const adminToken = jwt.sign(
        { userId: 1, role: "system_admin", email: "admin@quickbite.com" },
        env.jwt.accessSecret
    );

import { closeDB } from "../../src/lib/knex/knex";
import { cacheProvider } from "../../src/lib/cache/init";

    before((_, done) => {
        const app = createApp();
        server = http.createServer(app);
        server.listen(0, () => {
            const addr = server.address() as any;
            baseUrl = `http://localhost:${addr.port}`;
            done();
        });
    });

    after(async () => {
        await new Promise<void>((resolve) => server.close(() => resolve()));
        await closeDB().catch(() => {});
        await cacheProvider.close().catch(() => {});
    });

    it("GET /api/health responds with 200 and service health status", async () => {
        const res = await fetch(`${baseUrl}/api/health`);
        assert.equal(res.status, 200);
        const body: any = await res.json();
        assert.ok(body.status === "ok" || body.status === "degraded");
        assert.equal(body.service, "order-service");
        assert.ok(body.timestamp);
    });

    it("POST /api/orders rejects unauthenticated requests with 401", async () => {
        const res = await fetch(`${baseUrl}/api/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        });
        assert.equal(res.status, 401);
        const body: any = await res.json();
        assert.equal(body.success, false);
    });

    it("POST /api/orders validates request body and rejects empty items with 400", async () => {
        const res = await fetch(`${baseUrl}/api/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${customerToken}`,
            },
            body: JSON.stringify({
                restaurantId: 2,
                branchId: 10,
                customerAddressId: 55,
                paymentMethod: "online",
                items: [],
            }),
        });
        assert.equal(res.status, 400);
        const body: any = await res.json();
        assert.equal(body.success, false);
    });

    it("POST /api/payments/webhook is accessible without JWT but rejects forged signature with 401", async () => {
        const res = await fetch(`${baseUrl}/api/payments/webhook`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-kashier-signature": "forged_signature_12345",
            },
            body: JSON.stringify({
                event: "pay",
                data: {
                    merchantOrderId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                    kashierOrderHash: "hash_test",
                    status: "SUCCESS",
                },
            }),
        });
        assert.equal(res.status, 401);
        const body: any = await res.json();
        assert.equal(body.success, false);
    });

    it("GET /api/finance/restaurants/:id/balance rejects unauthorized customer with 403", async () => {
        const res = await fetch(`${baseUrl}/api/finance/restaurants/2/balance`, {
            headers: { Authorization: `Bearer ${customerToken}` },
        });
        assert.equal(res.status, 403);
    });

    it("POST /api/finance/restaurants/:id/payouts rejects customer role with 403", async () => {
        const res = await fetch(`${baseUrl}/api/finance/restaurants/2/payouts`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${customerToken}`,
            },
            body: JSON.stringify({ amount: 1000, currency: "EGP" }),
        });
        assert.equal(res.status, 403);
    });

    it("POST /api/finance/restaurants/:id/payouts with admin token validates body requirements", async () => {
        const res = await fetch(`${baseUrl}/api/finance/restaurants/2/payouts`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({ amount: -50, currency: "EGP" }),
        });
        assert.equal(res.status, 400);
        const body: any = await res.json();
        assert.equal(body.success, false);
    });
});
