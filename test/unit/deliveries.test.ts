import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ManualAssignDeliveryDTO } from "../../src/app/deliveries/dto/delivery.request.dto";
import {
    DeliveryAssignmentResponseDTO,
    DeliveryFulfillmentResponseDTO,
} from "../../src/app/deliveries/dto/delivery.response.dto";
import { Order } from "../../src/app/orders/entity/order.entity";
import { OrderStatus, PaymentMethod, Currency } from "../../src/app/orders/enums";
import { validateBody } from "../../src/lib/validation/validate";
import { calculateCommission, calculateRestaurantNet } from "../../src/pkg/utils/money";

describe("Deliveries Domain Module", () => {
    describe("Request DTO Validation", () => {
        it("validates ManualAssignDeliveryDTO with positive agentId", async () => {
            const body = { agentId: 99 };
            const dto = await validateBody(ManualAssignDeliveryDTO, body);
            assert.equal(dto.agentId, 99);
        });

        it("rejects ManualAssignDeliveryDTO with non-positive agentId", async () => {
            await assert.rejects(
                () => validateBody(ManualAssignDeliveryDTO, { agentId: 0 }),
                (err: any) => err.statusCode === 400
            );
            await assert.rejects(
                () => validateBody(ManualAssignDeliveryDTO, { agentId: -5 }),
                (err: any) => err.statusCode === 400
            );
        });
    });

    describe("Response DTO Formatting", () => {
        const now = new Date();
        const baseOrder = new Order({
            id: 1,
            publicId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
            region: "eg",
            restaurantId: 2,
            branchId: 10,
            customerId: 5,
            customerAddressId: 55,
            deliveryLat: 30.0444,
            deliveryLng: 31.2357,
            deliveryAddressTextSnapshot: "123 Tahrir Sq, Cairo",
            status: OrderStatus.OUT_FOR_DELIVERY,
            paymentMethod: PaymentMethod.ONLINE,
            subtotal: 20000,
            deliveryFee: 2500,
            serviceFee: 1000,
            totalAmount: 23500,
            currency: Currency.EGP,
            deliveryAgentId: 99,
            assignedAt: now,
            pickedAt: now,
            deliveredAt: now,
            createdAt: now,
            updatedAt: now,
        });

        it("formats DeliveryAssignmentResponseDTO accurately", () => {
            const dto = DeliveryAssignmentResponseDTO.from(baseOrder);
            assert.equal(dto.orderPublicId, "3fa85f64-5717-4562-b3fc-2c963f66afa6");
            assert.equal(dto.agentId, 99);
            assert.equal(dto.assignedAt, now.toISOString());
        });

        it("formats DeliveryFulfillmentResponseDTO accurately", () => {
            baseOrder.status = OrderStatus.DELIVERED;
            const dto = DeliveryFulfillmentResponseDTO.from(baseOrder, 2500);
            assert.equal(dto.orderPublicId, "3fa85f64-5717-4562-b3fc-2c963f66afa6");
            assert.equal(dto.status, OrderStatus.DELIVERED);
            assert.equal(dto.agentEarningAmount, 2500);
            assert.equal(dto.currency, "EGP");
            assert.equal(dto.deliveredAt, now.toISOString());
        });
    });

    describe("Settlement Calculation Integrity", () => {
        it("calculates accurate restaurant net balance and commission", () => {
            const subtotal = 35000; // 350.00 EGP
            const commissionPercent = 15; // 15%
            const commission = calculateCommission(subtotal, commissionPercent); // 5250
            const restaurantNet = calculateRestaurantNet(subtotal, commission); // 29750

            assert.equal(commission, 5250);
            assert.equal(restaurantNet, 29750);
            assert.equal(commission + restaurantNet, subtotal);
        });
    });
});
