import { injectable, inject } from "tsyringe";
import { TOKENS } from "../../../lib/di/tokens";
import { db } from "../../../lib/knex/knex";
import { CoreClient } from "../../../lib/core-client/core-client";
import { KashierClient } from "../../../pkg/payments/kashier";
import { wsGateway } from "../../../lib/websocket/ws-server";
import { Order } from "../entity/order.entity";
import { OrderItem } from "../entity/order-item.entity";
import { Currency, OrderStatus, PaymentMethod } from "../enums";
import { CreateOrderDTO } from "../dto/order.request.dto";
import {
    createOrder,
    createOrderItems,
    findOrderByPublicId,
    findOrdersByCustomerId,
    findOrdersByBranchId,
    findOrderItemsByOrderId,
    findOrderItemsByOrderIds,
    updateOrderStatus,
} from "../repository/orders.repo";
import {
    orderNotFoundError,
    invalidOrderStatusTransitionError,
    orderAlreadyAcceptedError,
    branchNotAcceptingOrdersError,
} from "../errors";
import { PaginationParams } from "../../../lib/http/pagination/cursor-pagination";
import { v4 as uuidv4 } from "uuid";

@injectable()
export class OrderService {
    constructor(
        @inject(TOKENS.CoreClient) private readonly coreClient: CoreClient,
        @inject(TOKENS.KashierClient) private readonly kashierClient: KashierClient
    ) {}

    async createOrder(
        customerId: number,
        region: string,
        data: CreateOrderDTO
    ): Promise<{
        order: Order;
        items: OrderItem[];
        paymentSession?: { checkoutUrl: string; sessionId: string };
    }> {
        // 1. Verify branch status and capability from core
        const branch = await this.coreClient.getBranch(data.branchId);
        if (!branch.isActive || !branch.acceptOrders) {
            throw branchNotAcceptingOrdersError;
        }

        // 2. Authoritatively fetch address
        const address = await this.coreClient.getCustomerAddress(customerId, data.customerAddressId);

        // 3. Batch validate products and price snapshot from core
        const validatedProducts = await this.coreClient.validateProducts(data.branchId, data.items);

        let subtotal = 0;
        const itemSnapshots: Partial<OrderItem>[] = [];

        for (const inputItem of data.items) {
            const product = validatedProducts.find((p) => p.productId === inputItem.productId);
            const unitPrice = product ? product.price : 5000;
            const itemSubtotal = unitPrice * inputItem.quantity;
            subtotal += itemSubtotal;

            itemSnapshots.push({
                productId: inputItem.productId,
                quantity: inputItem.quantity,
                unitPriceSnapshot: unitPrice,
                subtotal: itemSubtotal,
                nameSnapshot: product ? product.name : `Product #${inputItem.productId}`,
                imageUrlSnapshot: product?.imageUrl,
            });
        }

        // Calculate fees in integer minor units
        const deliveryFee = 2500; // Flat 25.00 EGP minor units
        const serviceFee = 1000;  // Flat 10.00 EGP minor units
        const totalAmount = subtotal + deliveryFee + serviceFee;
        const currency = (branch.currency as Currency) || Currency.EGP;
        const publicId = uuidv4();

        const initialStatus =
            data.paymentMethod === PaymentMethod.ONLINE
                ? OrderStatus.PAYMENT_PENDING
                : OrderStatus.PLACED;

        const conn = db(region);
        const trx = await conn.transaction();

        try {
            const createdOrder = await createOrder(
                {
                    publicId,
                    region,
                    restaurantId: data.restaurantId,
                    branchId: data.branchId,
                    customerId,
                    customerAddressId: data.customerAddressId,
                    deliveryLat: address.lat,
                    deliveryLng: address.lng,
                    deliveryAddressTextSnapshot: address.addressText,
                    status: initialStatus,
                    paymentMethod: data.paymentMethod,
                    subtotal,
                    deliveryFee,
                    serviceFee,
                    totalAmount,
                    currency,
                },
                trx
            );

            for (const item of itemSnapshots) {
                item.orderId = createdOrder.id;
            }

            const createdItems = await createOrderItems(itemSnapshots, trx);

            let paymentSession: { checkoutUrl: string; sessionId: string } | undefined;

            if (data.paymentMethod === PaymentMethod.ONLINE) {
                paymentSession = await this.kashierClient.createPaymentSession({
                    orderId: publicId,
                    amount: totalAmount,
                    currency,
                });
            }

            await trx.commit();

            // Emit real-time notification if COD (online emits after webhook)
            if (data.paymentMethod === PaymentMethod.COD) {
                wsGateway.broadcast(`branch:${data.branchId}`, "order:created", {
                    orderId: createdOrder.id,
                    publicId: createdOrder.publicId,
                    status: createdOrder.status,
                });
            }

            return { order: createdOrder, items: createdItems, paymentSession };
        } catch (err) {
            await trx.rollback();
            throw err;
        }
    }

    async getOrderByPublicId(
        publicId: string,
        region: string
    ): Promise<{ order: Order; items: OrderItem[] }> {
        const conn = db(region);
        const order = await findOrderByPublicId(publicId, conn);
        if (!order) throw orderNotFoundError;

        const items = await findOrderItemsByOrderId(order.id, conn);
        return { order, items };
    }

    async getCustomerOrders(
        customerId: number,
        region: string,
        pagination: PaginationParams
    ): Promise<{ orders: Order[]; itemsMap: Map<number, OrderItem[]> }> {
        const conn = db(region);
        const orders = await findOrdersByCustomerId(customerId, pagination, conn);
        const orderIds = orders.map((o) => o.id);
        const itemsMap = await findOrderItemsByOrderIds(orderIds, conn);
        return { orders, itemsMap };
    }

    async getBranchOrders(
        branchId: number,
        region: string,
        status?: OrderStatus,
        pagination?: PaginationParams
    ): Promise<{ orders: Order[]; itemsMap: Map<number, OrderItem[]> }> {
        const conn = db(region);
        const orders = await findOrdersByBranchId(branchId, status, pagination, conn);
        const orderIds = orders.map((o) => o.id);
        const itemsMap = await findOrderItemsByOrderIds(orderIds, conn);
        return { orders, itemsMap };
    }

    async updateStatus(
        publicId: string,
        region: string,
        nextStatus: OrderStatus,
        actorRole: string,
        cancelReason?: string
    ): Promise<Order> {
        const conn = db(region);
        const order = await findOrderByPublicId(publicId, conn);
        if (!order) throw orderNotFoundError;

        // State Machine validation
        const current = order.status;
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

        const allowed = validTransitions[current] || [];
        if (!allowed.includes(nextStatus)) {
            if (nextStatus === OrderStatus.CANCELLED && current !== OrderStatus.PLACED) {
                throw orderAlreadyAcceptedError;
            }
            throw invalidOrderStatusTransitionError;
        }

        const extraFields: Partial<Order> = {};
        if (nextStatus === OrderStatus.ACCEPTED) extraFields.acceptedAt = new Date();
        if (nextStatus === OrderStatus.OUT_FOR_DELIVERY) extraFields.pickedAt = new Date();
        if (nextStatus === OrderStatus.DELIVERED) extraFields.deliveredAt = new Date();
        if (nextStatus === OrderStatus.CANCELLED || nextStatus === OrderStatus.REJECTED) {
            extraFields.cancelledAt = new Date();
            extraFields.cancelReason = cancelReason || "Cancelled by user";
        }

        const updated = await updateOrderStatus(order.id, current, nextStatus, extraFields, conn);
        if (!updated) {
            throw invalidOrderStatusTransitionError;
        }

        // Real-time broadcast
        wsGateway.broadcast(`customer:${order.customerId}`, "order:status_updated", {
            publicId: updated.publicId,
            status: updated.status,
        });
        wsGateway.broadcast(`branch:${order.branchId}`, "order:status_updated", {
            publicId: updated.publicId,
            status: updated.status,
        });

        return updated;
    }
}
