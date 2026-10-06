import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { InitPaymentDTO, KashierWebhookDTO } from "../../src/app/payments/dto/payment.request.dto";
import {
    PaymentSessionResponseDTO,
    TransactionResponseDTO,
} from "../../src/app/payments/dto/payment.response.dto";
import { Transaction } from "../../src/app/payments/entity/transaction.entity";
import { PaymentMethodType, TransactionStatus, TransactionType } from "../../src/app/payments/enums";
import { Currency } from "../../src/app/orders/enums";
import { validateBody } from "../../src/lib/validation/validate";

describe("Payments Domain Module", () => {
    describe("Request DTO Validation", () => {
        it("validates InitPaymentDTO with UUID orderPublicId", async () => {
            const body = {
                orderPublicId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                merchantRedirectUrl: "https://quickbite.com/orders/success",
            };

            const dto = await validateBody(InitPaymentDTO, body);
            assert.equal(dto.orderPublicId, "3fa85f64-5717-4562-b3fc-2c963f66afa6");
            assert.equal(dto.merchantRedirectUrl, "https://quickbite.com/orders/success");
        });

        it("rejects InitPaymentDTO with non-UUID order identifier", async () => {
            const body = { orderPublicId: "invalid-uuid-string" };
            await assert.rejects(
                () => validateBody(InitPaymentDTO, body),
                (err: any) => err.statusCode === 400
            );
        });

        it("validates KashierWebhookDTO structure", async () => {
            const body = {
                event: "pay",
                data: {
                    merchantOrderId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                    kashierOrderHash: "hash_xyz_123",
                    status: "SUCCESS",
                    amount: 23500,
                    currency: "EGP",
                    signature: "test_sig",
                },
            };

            const dto = await validateBody(KashierWebhookDTO, body);
            assert.equal(dto.event, "pay");
            assert.equal(dto.data.merchantOrderId, "3fa85f64-5717-4562-b3fc-2c963f66afa6");
            assert.equal(dto.data.status, "SUCCESS");
            assert.equal(dto.data.amount, 23500);
        });
    });

    describe("Response DTO Formatting", () => {
        it("formats PaymentSessionResponseDTO accurately", () => {
            const dto = PaymentSessionResponseDTO.from(
                "sess_12345",
                "https://checkout.kashier.io/session/sess_12345",
                "3fa85f64-5717-4562-b3fc-2c963f66afa6"
            );

            assert.equal(dto.sessionId, "sess_12345");
            assert.equal(dto.checkoutUrl, "https://checkout.kashier.io/session/sess_12345");
            assert.equal(dto.orderPublicId, "3fa85f64-5717-4562-b3fc-2c963f66afa6");
        });

        it("formats TransactionResponseDTO with integer minor units", () => {
            const now = new Date();
            const tx = new Transaction({
                id: 42,
                region: "eg",
                orderId: 1,
                method: PaymentMethodType.ONLINE,
                transactionType: TransactionType.PAYMENT,
                status: TransactionStatus.COMPLETED,
                amount: 23500,
                currency: Currency.EGP,
                providerReferenceId: "kashier_tx_8899",
                srcAccId: "5",
                dstAccId: "kashier_escrow",
                createdAt: now,
                updatedAt: now,
            });

            const dto = TransactionResponseDTO.from(tx);
            assert.equal(dto.id, 42);
            assert.equal(dto.orderId, 1);
            assert.equal(dto.method, PaymentMethodType.ONLINE);
            assert.equal(dto.status, TransactionStatus.COMPLETED);
            assert.equal(dto.amount, 23500);
            assert.equal(dto.currency, Currency.EGP);
            assert.equal(dto.createdAt, now.toISOString());
        });
    });
});
