import { Order } from "../entity/order.entity";
import { OrderItem } from "../entity/order-item.entity";
import { Currency, OrderStatus, PaymentMethod } from "../enums";

export class OrderItemResponseDTO {
    id!: number;
    productId!: number;
    quantity!: number;
    unitPrice!: number; // minor units
    subtotal!: number;  // minor units
    name!: string;
    imageUrl?: string;

    static from(item: OrderItem): OrderItemResponseDTO {
        const dto = new OrderItemResponseDTO();
        dto.id = item.id;
        dto.productId = item.productId;
        dto.quantity = item.quantity;
        dto.unitPrice = Number(item.unitPriceSnapshot);
        dto.subtotal = Number(item.subtotal);
        dto.name = item.nameSnapshot;
        dto.imageUrl = item.imageUrlSnapshot;
        return dto;
    }
}

export class OrderResponseDTO {
    id!: number;
    publicId!: string;
    region!: string;
    restaurantId!: number;
    branchId!: number;
    customerId!: number;
    status!: OrderStatus;
    paymentMethod!: PaymentMethod;
    subtotal!: number;     // minor units
    deliveryFee!: number;  // minor units
    serviceFee!: number;   // minor units
    totalAmount!: number;  // minor units
    currency!: Currency;
    deliveryAddress!: string;
    deliveryLat!: number;
    deliveryLng!: number;
    deliveryAgentId?: number;
    createdAt!: string;
    updatedAt!: string;
    acceptedAt?: string;
    pickedAt?: string;
    deliveredAt?: string;
    cancelledAt?: string;
    cancelReason?: string;
    items?: OrderItemResponseDTO[];
    paymentSession?: {
        checkoutUrl: string;
        sessionId?: string;
    };

    static from(order: Order, items: OrderItem[] = []): OrderResponseDTO {
        const dto = new OrderResponseDTO();
        dto.id = Number(order.id);
        dto.publicId = order.publicId;
        dto.region = order.region;
        dto.restaurantId = Number(order.restaurantId);
        dto.branchId = Number(order.branchId);
        dto.customerId = Number(order.customerId);
        dto.status = order.status;
        dto.paymentMethod = order.paymentMethod;
        dto.subtotal = Number(order.subtotal);
        dto.deliveryFee = Number(order.deliveryFee);
        dto.serviceFee = Number(order.serviceFee);
        dto.totalAmount = Number(order.totalAmount);
        dto.currency = order.currency;
        dto.deliveryAddress = order.deliveryAddressTextSnapshot;
        dto.deliveryLat = Number(order.deliveryLat);
        dto.deliveryLng = Number(order.deliveryLng);
        dto.deliveryAgentId = order.deliveryAgentId ? Number(order.deliveryAgentId) : undefined;
        dto.createdAt = order.createdAt instanceof Date ? order.createdAt.toISOString() : new Date(order.createdAt).toISOString();
        dto.updatedAt = order.updatedAt instanceof Date ? order.updatedAt.toISOString() : new Date(order.updatedAt).toISOString();
        dto.acceptedAt = order.acceptedAt ? (order.acceptedAt instanceof Date ? order.acceptedAt.toISOString() : new Date(order.acceptedAt).toISOString()) : undefined;
        dto.pickedAt = order.pickedAt ? (order.pickedAt instanceof Date ? order.pickedAt.toISOString() : new Date(order.pickedAt).toISOString()) : undefined;
        dto.deliveredAt = order.deliveredAt ? (order.deliveredAt instanceof Date ? order.deliveredAt.toISOString() : new Date(order.deliveredAt).toISOString()) : undefined;
        dto.cancelledAt = order.cancelledAt ? (order.cancelledAt instanceof Date ? order.cancelledAt.toISOString() : new Date(order.cancelledAt).toISOString()) : undefined;
        dto.cancelReason = order.cancelReason;
        dto.items = items.map(OrderItemResponseDTO.from);
        return dto;
    }
}

export class OrderStatusResponseDTO {
    publicId!: string;
    status!: OrderStatus;
    updatedAt!: string;

    static from(order: Order): OrderStatusResponseDTO {
        const dto = new OrderStatusResponseDTO();
        dto.publicId = order.publicId;
        dto.status = order.status;
        dto.updatedAt = order.updatedAt instanceof Date ? order.updatedAt.toISOString() : new Date(order.updatedAt).toISOString();
        return dto;
    }
}
