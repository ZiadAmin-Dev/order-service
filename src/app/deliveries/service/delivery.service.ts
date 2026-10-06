import { injectable, inject } from "tsyringe";
import { TOKENS } from "../../../lib/di/tokens";
import { db } from "../../../lib/knex/knex";
import { CoreClient } from "../../../lib/core-client/core-client";
import { wsGateway } from "../../../lib/websocket/ws-server";
import { findOrderByPublicId, updateOrderStatus } from "../../orders/repository/orders.repo";
import { OrderStatus } from "../../orders/enums";
import { Order } from "../../orders/entity/order.entity";
import {
    deliveryNotFoundError,
    unauthorizedDeliveryActionError,
    invalidDeliveryStateTransitionError,
} from "../errors";
import { calculateCommission, calculateRestaurantNet } from "../../../pkg/utils/money";

@injectable()
export class DeliveryService {
    constructor(@inject(TOKENS.CoreClient) private readonly coreClient: CoreClient) {}

    async manualAssign(publicId: string, agentId: number, region: string): Promise<Order> {
        const conn = db(region);
        const order = await findOrderByPublicId(publicId, conn);
        if (!order) throw deliveryNotFoundError;

        const updated = await updateOrderStatus(
            order.id,
            [OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP],
            order.status,
            { deliveryAgentId: agentId },
            conn
        );

        if (!updated) {
            throw invalidDeliveryStateTransitionError;
        }

        // Emit real-time invite to agent room
        wsGateway.broadcast(`agent:${agentId}`, "delivery:assigned", {
            orderPublicId: updated.publicId,
            branchId: updated.branchId,
            deliveryAddress: updated.deliveryAddressTextSnapshot,
        });

        return updated;
    }

    async pickup(publicId: string, agentId: number, region: string): Promise<Order> {
        const conn = db(region);
        const order = await findOrderByPublicId(publicId, conn);
        if (!order) throw deliveryNotFoundError;

        if (order.deliveryAgentId !== agentId) {
            throw unauthorizedDeliveryActionError;
        }

        const updated = await updateOrderStatus(
            order.id,
            [OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP],
            OrderStatus.OUT_FOR_DELIVERY,
            { pickedAt: new Date() },
            conn
        );

        if (!updated) {
            throw invalidDeliveryStateTransitionError;
        }

        wsGateway.broadcast(`customer:${order.customerId}`, "order:out_for_delivery", {
            publicId: updated.publicId,
            status: OrderStatus.OUT_FOR_DELIVERY,
        });
        wsGateway.broadcast(`branch:${order.branchId}`, "order:out_for_delivery", {
            publicId: updated.publicId,
            status: OrderStatus.OUT_FOR_DELIVERY,
        });

        return updated;
    }

    async fulfill(
        publicId: string,
        agentId: number,
        region: string
    ): Promise<{ order: Order; agentEarning: number }> {
        const conn = db(region);
        const order = await findOrderByPublicId(publicId, conn);
        if (!order) throw deliveryNotFoundError;

        if (order.deliveryAgentId !== agentId) {
            throw unauthorizedDeliveryActionError;
        }

        const agentEarning = order.deliveryFee || 2500;
        const branch = await this.coreClient.getBranch(order.branchId);
        const commissionAmount = calculateCommission(order.subtotal, branch.commission || 15);
        const netRestaurantCredit = calculateRestaurantNet(order.subtotal, commissionAmount);

        const trx = await conn.transaction();
        try {
            // 1. Advance order status to DELIVERED
            const updated = await updateOrderStatus(
                order.id,
                OrderStatus.OUT_FOR_DELIVERY,
                OrderStatus.DELIVERED,
                { deliveredAt: new Date() },
                trx
            );

            if (!updated) {
                throw invalidDeliveryStateTransitionError;
            }

            // 2. Record agent earnings
            await trx("agent_earnings").insert({
                region,
                agent_id: agentId,
                order_id: order.id,
                amount: agentEarning,
                currency: order.currency,
                created_at: new Date(),
            });

            // 3. Record commission transaction
            await trx("transactions").insert({
                region,
                order_id: order.id,
                method: "internal_balance",
                transaction_type: "commission",
                status: "completed",
                amount: commissionAmount,
                currency: order.currency,
                src_acc_id: String(order.restaurantId),
                dst_acc_id: "quickbite_platform",
                note: `Commission for order #${order.id}`,
                created_at: new Date(),
                updated_at: new Date(),
            });

            // 4. Credit restaurant balance
            await trx.raw(
                `
                INSERT INTO restaurant_balances (restaurant_id, region, balance, currency, updated_at)
                VALUES (?, ?, ?, ?, NOW())
                ON CONFLICT (restaurant_id) DO UPDATE
                SET balance = restaurant_balances.balance + ?, updated_at = NOW();
                `,
                [order.restaurantId, region, netRestaurantCredit, order.currency, netRestaurantCredit]
            );

            // 5. If COD, complete the pending payment transaction
            if (order.paymentMethod === "cod") {
                await trx("transactions")
                    .where({ order_id: order.id, transaction_type: "payment" })
                    .update({ status: "completed", updated_at: new Date() });
            }

            await trx.commit();

            // Emit live updates
            wsGateway.broadcast(`customer:${order.customerId}`, "order:delivered", {
                publicId: updated.publicId,
                status: OrderStatus.DELIVERED,
            });
            wsGateway.broadcast(`branch:${order.branchId}`, "order:delivered", {
                publicId: updated.publicId,
                status: OrderStatus.DELIVERED,
            });

            return { order: updated, agentEarning };
        } catch (err) {
            await trx.rollback();
            throw err;
        }
    }
}
