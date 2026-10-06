import { Order } from "../../orders/entity/order.entity";
import { OrderStatus } from "../../orders/enums";

export class DeliveryAssignmentResponseDTO {
    orderPublicId!: string;
    agentId!: number;
    assignedAt!: string;

    static from(order: Order): DeliveryAssignmentResponseDTO {
        const dto = new DeliveryAssignmentResponseDTO();
        dto.orderPublicId = order.publicId;
        dto.agentId = Number(order.deliveryAgentId);
        dto.assignedAt = (order.assignedAt || new Date()).toISOString();
        return dto;
    }
}

export class DeliveryFulfillmentResponseDTO {
    orderPublicId!: string;
    status!: OrderStatus;
    deliveredAt!: string;
    agentEarningAmount!: number; // minor units
    currency!: string;

    static from(
        order: Order,
        agentEarning: number
    ): DeliveryFulfillmentResponseDTO {
        const dto = new DeliveryFulfillmentResponseDTO();
        dto.orderPublicId = order.publicId;
        dto.status = order.status;
        dto.deliveredAt = (order.deliveredAt || new Date()).toISOString();
        dto.agentEarningAmount = agentEarning;
        dto.currency = order.currency;
        return dto;
    }
}
