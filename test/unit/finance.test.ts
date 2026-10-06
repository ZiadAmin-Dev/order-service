import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CreatePayoutDTO } from "../../src/app/restaurant-finance/dto/finance.request.dto";
import {
    RestaurantBalanceResponseDTO,
    PayoutResponseDTO,
} from "../../src/app/restaurant-finance/dto/finance.response.dto";
import { RestaurantBalance } from "../../src/app/restaurant-finance/entity/restaurant-balance.entity";
import { Transaction } from "../../src/app/payments/entity/transaction.entity";
import { PaymentMethodType, TransactionStatus, TransactionType } from "../../src/app/payments/enums";
import { Currency } from "../../src/app/orders/enums";
import { validateBody } from "../../src/lib/validation/validate";

describe("Restaurant Finance Domain Module", () => {
    describe("Request DTO Validation", () => {
        it("validates valid CreatePayoutDTO", async () => {
            const body = {
                amount: 500000, // 5,000.00 EGP
                currency: "EGP",
                note: "Bank wire transfer #TRX-1122",
            };

            const dto = await validateBody(CreatePayoutDTO, body);
            assert.equal(dto.amount, 500000);
            assert.equal(dto.currency, Currency.EGP);
            assert.equal(dto.note, "Bank wire transfer #TRX-1122");
        });

        it("rejects CreatePayoutDTO with zero or negative amount", async () => {
            await assert.rejects(
                () => validateBody(CreatePayoutDTO, { amount: 0, currency: "EGP" }),
                (err: any) => err.statusCode === 400
            );

            await assert.rejects(
                () => validateBody(CreatePayoutDTO, { amount: -100, currency: "EGP" }),
                (err: any) => err.statusCode === 400
            );
        });

        it("rejects CreatePayoutDTO with invalid currency", async () => {
            await assert.rejects(
                () => validateBody(CreatePayoutDTO, { amount: 1000, currency: "INVALID_CURRENCY" }),
                (err: any) => err.statusCode === 400
            );
        });
    });

    describe("Response DTO Formatting & Accounting Integrity", () => {
        const now = new Date();

        it("formats RestaurantBalanceResponseDTO in integer minor units", () => {
            const entity = new RestaurantBalance({
                restaurantId: 2,
                region: "eg",
                balance: 1850000, // 18,500.00 EGP
                currency: Currency.EGP,
                updatedAt: now,
            });

            const dto = RestaurantBalanceResponseDTO.from(entity);
            assert.equal(dto.restaurantId, 2);
            assert.equal(dto.balance, 1850000);
            assert.equal(dto.currency, "EGP");
            assert.equal(dto.updatedAt, now.toISOString());
        });

        it("formats PayoutResponseDTO with remaining balance calculation", () => {
            const tx = new Transaction({
                id: 88,
                region: "eg",
                method: PaymentMethodType.BANK_TRANSFER,
                transactionType: TransactionType.PAYOUT,
                status: TransactionStatus.COMPLETED,
                amount: 1000000,
                currency: Currency.EGP,
                srcAccId: undefined, // NULL system issuance
                dstAccId: "2",
                createdAt: now,
                updatedAt: now,
            });

            const dto = PayoutResponseDTO.from(tx, 850000);
            assert.equal(dto.transactionId, 88);
            assert.equal(dto.restaurantId, 2);
            assert.equal(dto.payoutAmount, 1000000);
            assert.equal(dto.remainingBalance, 850000);
            assert.equal(dto.currency, "EGP");
            assert.equal(dto.createdAt, now.toISOString());
            assert.equal(tx.srcAccId, undefined); // Confirms platform system-initiated transaction semantics
        });
    });
});
