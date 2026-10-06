import { injectable } from "tsyringe";
import { db } from "../../../lib/knex/knex";
import {
    findRestaurantBalance,
    lockRestaurantBalance,
    updateRestaurantBalance,
} from "../repository/finance.repo";
import { RestaurantBalance } from "../entity/restaurant-balance.entity";
import { Transaction } from "../../payments/entity/transaction.entity";
import { PaymentMethodType, TransactionStatus, TransactionType } from "../../payments/enums";
import { CreatePayoutDTO } from "../dto/finance.request.dto";
import {
    restaurantBalanceNotFoundError,
    insufficientBalanceError,
    invalidPayoutAmountError,
} from "../errors";

@injectable()
export class FinanceService {
    async getRestaurantBalance(restaurantId: number, region: string): Promise<RestaurantBalance> {
        const conn = db(region);
        const balance = await findRestaurantBalance(restaurantId, conn);
        if (!balance) {
            throw restaurantBalanceNotFoundError;
        }
        return balance;
    }

    async createPayout(
        restaurantId: number,
        region: string,
        data: CreatePayoutDTO
    ): Promise<{ transaction: Transaction; remainingBalance: number }> {
        if (!data.amount || data.amount <= 0) {
            throw invalidPayoutAmountError;
        }

        const conn = db(region);
        const trx = await conn.transaction();

        try {
            // Pessimistic lock on running balance
            const currentBalanceRecord = await lockRestaurantBalance(restaurantId, trx);
            if (!currentBalanceRecord) {
                throw restaurantBalanceNotFoundError;
            }

            if (currentBalanceRecord.balance < data.amount) {
                throw insufficientBalanceError;
            }

            const remainingBalance = currentBalanceRecord.balance - data.amount;

            // Insert payout transaction ledger record (src_acc_id = NULL indicates platform issuance)
            const [txRow] = await trx("transactions")
                .insert({
                    region,
                    order_id: null,
                    provider_id: null,
                    method: PaymentMethodType.BANK_TRANSFER,
                    transaction_type: TransactionType.PAYOUT,
                    status: TransactionStatus.COMPLETED,
                    amount: data.amount,
                    currency: data.currency,
                    src_acc_id: null,
                    dst_acc_id: String(restaurantId),
                    note: data.note || "Admin payout disbursement",
                    created_at: new Date(),
                    updated_at: new Date(),
                })
                .returning([
                    "id",
                    "region",
                    "order_id",
                    "provider_id",
                    "method",
                    "transaction_type",
                    "status",
                    "amount",
                    "currency",
                    "provider_reference_id",
                    "idempotency_key",
                    "is_refunded",
                    "refunded_payment_id",
                    "src_acc_id",
                    "dst_acc_id",
                    "note",
                    "created_at",
                    "updated_at",
                ]);

            // Deduct from running balance
            await updateRestaurantBalance(restaurantId, remainingBalance, trx);

            await trx.commit();

            const transaction = new Transaction({
                id: Number(txRow.id),
                region: txRow.region,
                orderId: txRow.order_id ? Number(txRow.order_id) : undefined,
                providerId: txRow.provider_id ? Number(txRow.provider_id) : undefined,
                method: txRow.method,
                transactionType: txRow.transaction_type,
                status: txRow.status,
                amount: Number(txRow.amount),
                currency: txRow.currency,
                srcAccId: txRow.src_acc_id,
                dstAccId: txRow.dst_acc_id,
                note: txRow.note,
                createdAt: new Date(txRow.created_at),
                updatedAt: new Date(txRow.updated_at),
            });

            return { transaction, remainingBalance };
        } catch (err) {
            await trx.rollback();
            throw err;
        }
    }
}
