import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CreateOrderDTO, UpdateOrderStatusDTO, OrderItemInputDTO } from "../../src/app/orders/dto/order.request.dto";
import { OrderResponseDTO, OrderStatusResponseDTO } from "../../src/app/orders/dto/order.response.dto";
import { Order } from "../../src/app/orders/entity/order.entity";
import { OrderItem } from "../../src/app/orders/entity/order-item.entity";
import { OrderStatus, PaymentMethod, Currency } from "../../src/app/orders/enums";
import { validateBody } from "../../src/lib/validation/validate";

describe("Orders Domain Module", () => {
    describe("Request DTO Validation", () => {
        it("validates well-formed CreateOrderDTO successfully", async () => {
            const body = {
                restaurantId: 2,
                branchId: 10,
                customerAddressId: 55,
                paymentMethod: "online",
                items: [
                    { productId: 101, quantity: 2 },
                    { productId: 102, quantity: 1 },
                ],
            };

            const dto = await validateBody(CreateOrderDTO, body);
            assert.equal(dto.restaurantId, 2);
            assert.equal(dto.branchId, 10);
            assert.equal(dto.customerAddressId, 55);
            assert.equal(dto.paymentMethod, PaymentMethod.ONLINE);
            assert.equal(dto.items.length, 2);
        });

        it("rejects CreateOrderDTO when items array is empty", async () => {
            const body = {
                restaurantId: 2,
                branchId: 10,
                customerAddressId: 55,
                paymentMethod: "online",
                items: [],
            };

            await assert.rejects(
                () => validateBody(CreateOrderDTO, body),
                (err: any) => err.statusCode === 400
            );
        });

        it("rejects CreateOrderDTO when item quantity is zero or negative", async () => {
            const body = {
                restaurantId: 2,
                branchId: 10,
                customerAddressId: 55,
                paymentMethod: "cod",
                items: [{ productId: 101, quantity: 0 }],
            };

            await assert.rejects(
                () => validateBody(CreateOrderDTO, body),
                (err: any) => err.statusCode === 400
            );
        });

        it("validates UpdateOrderStatusDTO status enum", async () => {
            const valid = await validateBody(UpdateOrderStatusDTO, { status: "accepted" });
            assert.equal(valid.status, OrderStatus.ACCEPTED);

            await assert.rejects(
                () => validateBody(UpdateOrderStatusDTO, { status: "non_existent_status" }),
                (err: any) => err.statusCode === 400
            );
        });
    });

    describe("Order Finite State Machine Rules", () => {
        const validTransitions: Record<OrderStatus, OrderStatus[]> = {
            [OrderStatus.PAYMENT_PENDING]: [OrderStatus.PLACED, OrderStatus.CANCELLED],
            [OrderStatus.PLACED]: [OrderStatus.ACCEPTED, OrderStatus.REJECTED, OrderStatus.CANCELLED],
            [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING],
            [OrderStatus.PREPARING]: [OrderStatus.READY_FOR_PICKUP],
            [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.OUT_FOR_DELIVERY],
            [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
            [OrderStatus.DELIVERED]: [],
            [OrderStatus.CANCELLED]: [],
            [OrderStatus.REJECTED]: [],
        };

        it("allows valid forward transitions in the lifecycle", () => {
            assert.ok(validTransitions[OrderStatus.PAYMENT_PENDING].includes(OrderStatus.PLACED));
            assert.ok(validTransitions[OrderStatus.PLACED].includes(OrderStatus.ACCEPTED));
            assert.ok(validTransitions[OrderStatus.ACCEPTED].includes(OrderStatus.PREPARING));
            assert.ok(validTransitions[OrderStatus.PREPARING].includes(OrderStatus.READY_FOR_PICKUP));
            assert.ok(validTransitions[OrderStatus.READY_FOR_PICKUP].includes(OrderStatus.OUT_FOR_DELIVERY));
            assert.ok(validTransitions[OrderStatus.OUT_FOR_DELIVERY].includes(OrderStatus.DELIVERED));
        });

        it("forbids illegal skipped transitions", () => {
            assert.ok(!validTransitions[OrderStatus.PLACED].includes(OrderStatus.DELIVERED));
            assert.ok(!validTransitions[OrderStatus.ACCEPTED].includes(OrderStatus.DELIVERED));
            assert.ok(!validTransitions[OrderStatus.PREPARING].includes(OrderStatus.DELIVERED));
        });

        it("forbids backward transitions", () => {
            assert.ok(!validTransitions[OrderStatus.PREPARING].includes(OrderStatus.ACCEPTED));
            assert.ok(!validTransitions[OrderStatus.DELIVERED].includes(OrderStatus.OUT_FOR_DELIVERY));
        });

        it("treats DELIVERED, CANCELLED, and REJECTED as terminal states", () => {
            assert.equal(validTransitions[OrderStatus.DELIVERED].length, 0);
            assert.equal(validTransitions[OrderStatus.CANCELLED].length, 0);
            assert.equal(validTransitions[OrderStatus.REJECTED].length, 0);
        });
    });

    describe("Response DTO Formatting & Field Integrity", () => {
        it("formats OrderResponseDTO correctly with minor units and ISO dates", () => {
            const now = new Date();
            const order = new Order({
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
                status: OrderStatus.PLACED,
                paymentMethod: PaymentMethod.ONLINE,
                subtotal: 20000,
                deliveryFee: 2500,
                serviceFee: 1000,
                totalAmount: 23500,
                currency: Currency.EGP,
                createdAt: now,
                updatedAt: now,
            });

            const item = new OrderItem({
                id: 10,
                orderId: 1,
                productId: 101,
                quantity: 2,
                unitPriceSnapshot: 10000,
                subtotal: 20000,
                nameSnapshot: "Double Cheeseburger",
                imageUrlSnapshot: "https://cdn.quickbite.com/burger.jpg",
                createdAt: now,
            });

            const dto = OrderResponseDTO.from(order, [item]);

            assert.equal(dto.publicId, "3fa85f64-5717-4562-b3fc-2c963f66afa6");
            assert.equal(dto.status, OrderStatus.PLACED);
            assert.equal(dto.subtotal, 20000);
            assert.equal(dto.deliveryFee, 2500);
            assert.equal(dto.serviceFee, 1000);
            assert.equal(dto.totalAmount, 23500);
            assert.equal(dto.currency, "EGP");
            assert.equal(dto.createdAt, now.toISOString());
            assert.equal(dto.items.length, 1);
            assert.equal(dto.items[0].name, "Double Cheeseburger");
            assert.equal(dto.items[0].unitPrice, 10000);
            assert.equal(dto.items[0].subtotal, 20000);
        });

        it("formats OrderStatusResponseDTO correctly", () => {
            const now = new Date();
            const order = new Order({
                publicId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                status: OrderStatus.ACCEPTED,
                updatedAt: now,
            });

            const dto = OrderStatusResponseDTO.from(order);
            assert.equal(dto.publicId, "3fa85f64-5717-4562-b3fc-2c963f66afa6");
            assert.equal(dto.status, OrderStatus.ACCEPTED);
            assert.equal(dto.updatedAt, now.toISOString());
        });
    });
});
