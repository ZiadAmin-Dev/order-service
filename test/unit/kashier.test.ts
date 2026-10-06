import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { KashierClient } from "../../src/pkg/payments/kashier";

describe("Kashier v3 Payment Gateway Client", () => {
    const config = {
        apiKey: "test_api_key_123",
        secretKey: "test_secret_key_456",
        merchantId: "MID-99-88",
        baseUrl: "https://api.kashier.io",
    };

    const client = new KashierClient(config);

    it("generates order hash conforming to Kashier v3 specification", () => {
        const orderId = "ord-abc-123";
        const amountMinor = 25000; // 250.00 EGP
        const currency = "EGP";

        const hash = client.generateOrderHash(orderId, amountMinor, currency);
        assert.ok(hash);
        assert.equal(typeof hash, "string");
        assert.equal(hash.length, 64); // SHA256 hex string

        const expectedPath = `/?payment=MID-99-88.ord-abc-123.250.00.EGP`;
        const expectedHash = crypto
            .createHmac("sha256", config.secretKey)
            .update(expectedPath)
            .digest("hex");

        assert.equal(hash, expectedHash);
    });

    it("verifies authentic webhook signature correctly", () => {
        const payload = {
            merchantOrderId: "ord-abc-123",
            kashierOrderHash: "hash_999",
            status: "SUCCESS",
            amount: 25000,
        };

        const payloadString = JSON.stringify(payload);
        const validSignature = crypto
            .createHmac("sha256", config.secretKey)
            .update(payloadString)
            .digest("hex");

        const isValid = client.verifyWebhookSignature(validSignature, payload);
        assert.equal(isValid, true);
    });

    it("rejects forged or tampered webhook signature", () => {
        const payload = {
            merchantOrderId: "ord-abc-123",
            amount: 25000,
        };

        const forgedSignature = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
        const isValid = client.verifyWebhookSignature(forgedSignature, payload);
        assert.equal(isValid, false);
    });

    it("creates payment session and formats hosted checkout URL", async () => {
        const session = await client.createPaymentSession({
            orderId: "ord-100",
            amount: 15000,
            currency: "EGP",
        });

        assert.ok(session.sessionId);
        assert.ok(session.sessionId.startsWith("sess_ord-100_"));
        assert.ok(session.checkoutUrl.includes("https://api.kashier.io/checkout"));
        assert.ok(session.checkoutUrl.includes("merchantId=MID-99-88"));
        assert.ok(session.checkoutUrl.includes("orderId=ord-100"));
        assert.ok(session.checkoutUrl.includes("amount=15000"));
        assert.ok(session.checkoutUrl.includes("currency=EGP"));
    });

    it("executes refund request", async () => {
        const refundResult = await client.refund({
            providerReferenceId: "ref_123",
            amount: 5000,
            currency: "EGP",
        });

        assert.equal(refundResult.status, "SUCCESS");
        assert.ok(refundResult.refundId.startsWith("ref_ref_123_"));
    });
});
