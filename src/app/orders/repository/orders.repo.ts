import { Knex } from "knex";
import { Order } from "../entity/order.entity";
import { OrderItem } from "../entity/order-item.entity";
import { OrderStatus } from "../enums";
import {
    PaginationParams,
    applyCursorPagination,
} from "../../../lib/http/pagination/cursor-pagination";

export const ORDER_COLUMNS = [
    "id",
    "public_id",
    "region",
    "restaurant_id",
    "branch_id",
    "customer_id",
    "customer_address_id",
    "delivery_lat",
    "delivery_lng",
    "delivery_address_text_snapshot",
    "status",
    "payment_method",
    "subtotal",
    "delivery_fee",
    "service_fee",
    "total_amount",
    "currency",
    "delivery_agent_id",
    "assigned_at",
    "accepted_at",
    "picked_at",
    "delivered_at",
    "cancelled_at",
    "cancel_reason",
    "created_at",
    "updated_at",
];

export const ORDER_ITEM_COLUMNS = [
    "id",
    "order_id",
    "product_id",
    "quantity",
    "unit_price_snapshot",
    "subtotal",
    "name_snapshot",
    "image_url_snapshot",
    "created_at",
];

function toOrderEntity(row: any): Order {
    return new Order({
        id: Number(row.id),
        publicId: row.public_id,
        region: row.region,
        restaurantId: Number(row.restaurant_id),
        branchId: Number(row.branch_id),
        customerId: Number(row.customer_id),
        customerAddressId: Number(row.customer_address_id),
        deliveryLat: Number(row.delivery_lat),
        deliveryLng: Number(row.delivery_lng),
        deliveryAddressTextSnapshot: row.delivery_address_text_snapshot,
        status: row.status,
        paymentMethod: row.payment_method,
        subtotal: Number(row.subtotal),
        deliveryFee: Number(row.delivery_fee),
        serviceFee: Number(row.service_fee),
        totalAmount: Number(row.total_amount),
        currency: row.currency,
        deliveryAgentId: row.delivery_agent_id ? Number(row.delivery_agent_id) : undefined,
        assignedAt: row.assigned_at ? new Date(row.assigned_at) : undefined,
        acceptedAt: row.accepted_at ? new Date(row.accepted_at) : undefined,
        pickedAt: row.picked_at ? new Date(row.picked_at) : undefined,
        deliveredAt: row.delivered_at ? new Date(row.delivered_at) : undefined,
        cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : undefined,
        cancelReason: row.cancel_reason,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    });
}

function toOrderItemEntity(row: any): OrderItem {
    return new OrderItem({
        id: Number(row.id),
        orderId: Number(row.order_id),
        productId: Number(row.product_id),
        quantity: Number(row.quantity),
        unitPriceSnapshot: Number(row.unit_price_snapshot),
        subtotal: Number(row.subtotal),
        nameSnapshot: row.name_snapshot,
        imageUrlSnapshot: row.image_url_snapshot,
        createdAt: new Date(row.created_at),
    });
}

export async function createOrder(data: Partial<Order>, conn: Knex): Promise<Order> {
    const [row] = await conn("orders")
        .insert({
            public_id: data.publicId,
            region: data.region,
            restaurant_id: data.restaurantId,
            branch_id: data.branchId,
            customer_id: data.customerId,
            customer_address_id: data.customerAddressId,
            delivery_lat: data.deliveryLat,
            delivery_lng: data.deliveryLng,
            delivery_address_text_snapshot: data.deliveryAddressTextSnapshot,
            status: data.status,
            payment_method: data.paymentMethod,
            subtotal: data.subtotal,
            delivery_fee: data.deliveryFee,
            service_fee: data.serviceFee,
            total_amount: data.totalAmount,
            currency: data.currency,
            delivery_agent_id: data.deliveryAgentId,
            created_at: data.createdAt || new Date(),
            updated_at: data.updatedAt || new Date(),
        })
        .returning(ORDER_COLUMNS);

    return toOrderEntity(row);
}

export async function createOrderItems(
    items: Partial<OrderItem>[],
    conn: Knex
): Promise<OrderItem[]> {
    const insertPayload = items.map((i) => ({
        order_id: i.orderId,
        product_id: i.productId,
        quantity: i.quantity,
        unit_price_snapshot: i.unitPriceSnapshot,
        subtotal: i.subtotal,
        name_snapshot: i.nameSnapshot,
        image_url_snapshot: i.imageUrlSnapshot,
        created_at: i.createdAt || new Date(),
    }));

    const rows = await conn("order_items").insert(insertPayload).returning(ORDER_ITEM_COLUMNS);
    return rows.map(toOrderItemEntity);
}

export async function findOrderById(id: number, conn: Knex): Promise<Order | undefined> {
    const row = await conn("orders").select(ORDER_COLUMNS).where("id", id).first();
    return row ? toOrderEntity(row) : undefined;
}

export async function findOrderByPublicId(
    publicId: string,
    conn: Knex
): Promise<Order | undefined> {
    const row = await conn("orders").select(ORDER_COLUMNS).where("public_id", publicId).first();
    return row ? toOrderEntity(row) : undefined;
}

export async function findOrdersByCustomerId(
    customerId: number,
    pagination: PaginationParams,
    conn: Knex
): Promise<Order[]> {
    let q = conn("orders").select(ORDER_COLUMNS).where("customer_id", customerId);
    q = applyCursorPagination(q, pagination);
    const rows = await q;
    return rows.map(toOrderEntity);
}

export async function findOrdersByBranchId(
    branchId: number,
    status?: OrderStatus,
    pagination?: PaginationParams,
    conn?: Knex
): Promise<Order[]> {
    let q = (conn || ({} as Knex))("orders").select(ORDER_COLUMNS).where("branch_id", branchId);
    if (status) {
        q = q.where("status", status);
    }
    if (pagination) {
        q = applyCursorPagination(q, pagination);
    } else {
        q = q.orderBy("created_at", "desc").limit(50);
    }
    const rows = await q;
    return rows.map(toOrderEntity);
}

export async function findOrderItemsByOrderId(
    orderId: number,
    conn: Knex
): Promise<OrderItem[]> {
    const rows = await conn("order_items")
        .select(ORDER_ITEM_COLUMNS)
        .where("order_id", orderId)
        .orderBy("id", "asc");
    return rows.map(toOrderItemEntity);
}

/**
 * Batch load items for multiple orders to prevent N+1 query scaling
 */
export async function findOrderItemsByOrderIds(
    orderIds: number[],
    conn: Knex
): Promise<Map<number, OrderItem[]>> {
    const map = new Map<number, OrderItem[]>();
    if (orderIds.length === 0) return map;

    const rows = await conn("order_items")
        .select(ORDER_ITEM_COLUMNS)
        .whereIn("order_id", orderIds)
        .orderBy("id", "asc");

    for (const row of rows) {
        const item = toOrderItemEntity(row);
        const list = map.get(item.orderId) || [];
        list.push(item);
        map.set(item.orderId, list);
    }
    return map;
}

export async function updateOrderStatus(
    orderId: number,
    expectedStatus: OrderStatus | OrderStatus[],
    newStatus: OrderStatus,
    extraFields: Partial<Order> = {},
    conn: Knex
): Promise<Order | undefined> {
    const updatePayload: Record<string, any> = {
        status: newStatus,
        updated_at: new Date(),
    };

    if (extraFields.acceptedAt) updatePayload.accepted_at = extraFields.acceptedAt;
    if (extraFields.pickedAt) updatePayload.picked_at = extraFields.pickedAt;
    if (extraFields.deliveredAt) updatePayload.delivered_at = extraFields.deliveredAt;
    if (extraFields.cancelledAt) updatePayload.cancelled_at = extraFields.cancelledAt;
    if (extraFields.cancelReason) updatePayload.cancel_reason = extraFields.cancelReason;
    if (extraFields.deliveryAgentId !== undefined) {
        updatePayload.delivery_agent_id = extraFields.deliveryAgentId;
        updatePayload.assigned_at = new Date();
    }

    let query = conn("orders").where("id", orderId);
    if (Array.isArray(expectedStatus)) {
        query = query.whereIn("status", expectedStatus);
    } else {
        query = query.where("status", expectedStatus);
    }

    const [row] = await query.update(updatePayload).returning(ORDER_COLUMNS);
    return row ? toOrderEntity(row) : undefined;
}
