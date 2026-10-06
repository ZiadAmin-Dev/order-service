import { injectable, inject } from "tsyringe";
import { TOKENS } from "../../../lib/di/tokens";
import { db } from "../../../lib/knex/knex";
import { KashierClient } from "../../../pkg/payments/kashier";
import { wsGateway } from "../../../lib/websocket/ws-server";
import { findOrderByPublicId, updateOrderStatus } from "../../orders/repository/orders.repo";
import {
    createTransaction,
    findTransactionByProviderRef,
    updateTransactionStatus,
} from "../repository/payments.repo";
import { Transaction } from "../entity/transaction.entity";
import { PaymentMethodType, TransactionStatus, TransactionType } from "../enums";
import { OrderStatus } from "../../orders/enums";
import { InitPaymentDTO, KashierWebhookDataDTO } from "../dto/payment.request.dto";
import {
    invalidWebhookSignatureError,
    paymentAlreadyCompletedError,
} from "../errors";
import { orderNotFoundError, unauthorizedOrderActionError } from "../../orders/errors";

@injectable()
export class PaymentService {
    constructor(
        @inject(TOKENS.KashierClient) private readonly kashierClient: KashierClient
    ) {}

    async initPaymentSession(
        customerId: number,
        region: string,
        data: InitPaymentDTO
    ): Promise<{ sessionId: string; checkoutUrl: string }> {
        const conn = db(region);
        const order = await findOrderByPublicId(data.orderPublicId, conn);
        if (!order) throw orderNotFoundError;

        if (order.customerId !== customerId) {
            throw unauthorizedOrderActionError;
        }

        if (order.status !== OrderStatus.PAYMENT_PENDING) {
            throw paymentAlreadyCompletedError;
        }

        const sessionResult = await this.kashierClient.createPaymentSession({
            orderId: order.publicId,
            amount: order.totalAmount,
            currency: order.currency,
            merchantRedirectUrl: data.merchantRedirectUrl,
        });

        await createTransaction(
            {
                region,
                orderId: order.id,
                method: PaymentMethodType.ONLINE,
                transactionType: TransactionType.PAYMENT,
                status: TransactionStatus.PENDING,
                amount: order.totalAmount,
                currency: order.currency,
                providerReferenceId: sessionResult.sessionId,
                srcAccId: String(customerId),
                dstAccId: "kashier_escrow",
            },
            conn
        );

        return sessionResult;
    }

    async processWebhook(
        region: string,
        signature: string,
        rawPayload: any,
        data: KashierWebhookDataDTO
    ): Promise<{ success: boolean; alreadyProcessed?: boolean }> {
        // 1. Signature Verification
        const isValid = this.kashierClient.verifyWebhookSignature(signature, rawPayload);
        if (!isValid) {
            throw invalidWebhookSignatureError;
        }

        const conn = db(region);
        const order = await findOrderByPublicId(data.merchantOrderId, conn);
        if (!order) throw orderNotFoundError;

        // 2. Idempotent Deduplication Check
        const existingTx = await findTransactionByProviderRef(data.kashierOrderHash, conn);
        if (existingTx && existingTx.status === TransactionStatus.COMPLETED) {
            return { success: true, alreadyProcessed: true };
        }

        const isSuccess = data.status === "SUCCESS";
        const trx = await conn.transaction();

        try {
            if (isSuccess) {
                // Update or create transaction
                if (existingTx) {
                    await updateTransactionStatus(existingTx.id, TransactionStatus.COMPLETED, {}, trx);
                } else {
                    await createTransaction(
                        {
                            region,
                            orderId: order.id,
                            method: PaymentMethodType.ONLINE,
                            transactionType: TransactionType.PAYMENT,
                            status: TransactionStatus.COMPLETED,
                            amount: order.totalAmount,
                            currency: order.currency,
                            providerReferenceId: data.kashierOrderHash,
                            srcAccId: String(order.customerId),
                            dstAccId: "kashier_escrow",
                        },
                        trx
                    );
                }

                // Advance order to PLACED
                await updateOrderStatus(
                    order.id,
                    OrderStatus.PAYMENT_PENDING,
                    OrderStatus.PLACED,
                    {},
                    trx
                );

                await trx.commit();

                // Real-time broadcast
                wsGateway.broadcast(`customer:${order.customerId}`, "order:payment_success", {
                    publicId: order.publicId,
                    status: OrderStatus.PLACED,
                });
                wsGateway.broadcast(`branch:${order.branchId}`, "order:created", {
                    publicId: order.publicId,
                    status: OrderStatus.PLACED,
                });
            } else {
                // Payment failed
                if (existingTx) {
                    await updateTransactionStatus(existingTx.id, TransactionStatus.FAILED, {}, trx);
                }
                await updateOrderStatus(
                    order.id,
                    OrderStatus.PAYMENT_PENDING,
                    OrderStatus.CANCELLED,
                    { cancelReason: "Online payment failed" },
                    trx
                );
                await trx.commit();

                wsGateway.broadcast(`customer:${order.customerId}`, "order:payment_failed", {
                    publicId: order.publicId,
                    status: OrderStatus.CANCELLED,
                });
            }

            return { success: true };
        } catch (err) {
            await trx.rollback();
            throw err;
        }
    }
}
