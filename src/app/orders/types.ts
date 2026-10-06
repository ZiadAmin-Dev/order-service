import { Currency, OrderStatus, PaymentMethod } from "./enums";

export interface OrderItemInput {
    productId: number;
    quantity: number;
}

export interface CreateOrderInput {
    customerId: number;
    restaurantId: number;
    branchId: number;
    customerAddressId: number;
    paymentMethod: PaymentMethod;
    items: OrderItemInput[];
}

export interface OrderCalculationSummary {
    subtotal: number;
    deliveryFee: number;
    serviceFee: number;
    totalAmount: number;
    currency: Currency;
}
