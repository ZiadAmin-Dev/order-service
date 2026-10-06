import { Currency, OrderStatus, PaymentMethod } from "../enums";

export class Order {
    id: number;
    publicId: string;
    region: string;
    restaurantId: number;
    branchId: number;
    customerId: number;
    customerAddressId: number;
    deliveryLat: number;
    deliveryLng: number;
    deliveryAddressTextSnapshot: string;
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    subtotal: number;
    deliveryFee: number;
    serviceFee: number;
    totalAmount: number;
    currency: Currency;
    deliveryAgentId?: number;
    assignedAt?: Date;
    acceptedAt?: Date;
    pickedAt?: Date;
    deliveredAt?: Date;
    cancelledAt?: Date;
    cancelReason?: string;
    createdAt: Date;
    updatedAt: Date;

    constructor(data: Partial<Order>) {
        this.id = data.id!;
        this.publicId = data.publicId!;
        this.region = data.region!;
        this.restaurantId = data.restaurantId!;
        this.branchId = data.branchId!;
        this.customerId = data.customerId!;
        this.customerAddressId = data.customerAddressId!;
        this.deliveryLat = data.deliveryLat!;
        this.deliveryLng = data.deliveryLng!;
        this.deliveryAddressTextSnapshot = data.deliveryAddressTextSnapshot!;
        this.status = data.status!;
        this.paymentMethod = data.paymentMethod!;
        this.subtotal = data.subtotal!;
        this.deliveryFee = data.deliveryFee!;
        this.serviceFee = data.serviceFee!;
        this.totalAmount = data.totalAmount!;
        this.currency = data.currency!;
        this.deliveryAgentId = data.deliveryAgentId;
        this.assignedAt = data.assignedAt;
        this.acceptedAt = data.acceptedAt;
        this.pickedAt = data.pickedAt;
        this.deliveredAt = data.deliveredAt;
        this.cancelledAt = data.cancelledAt;
        this.cancelReason = data.cancelReason;
        this.createdAt = data.createdAt ?? new Date();
        this.updatedAt = data.updatedAt ?? new Date();
    }
}
