import { Knex } from "knex";
import { Transaction } from "../entity/transaction.entity";
import { TransactionStatus } from "../enums";

export const TRANSACTION_COLUMNS = [
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
];

function toTransactionEntity(row: any): Transaction {
    return new Transaction({
        id: Number(row.id),
        region: row.region,
        orderId: row.order_id ? Number(row.order_id) : undefined,
        providerId: row.provider_id ? Number(row.provider_id) : undefined,
        method: row.method,
        transactionType: row.transaction_type,
        status: row.status,
        amount: Number(row.amount),
        currency: row.currency,
        providerReferenceId: row.provider_reference_id,
        idempotencyKey: row.idempotency_key,
        isRefunded: Boolean(row.is_refunded),
        refundedPaymentId: row.refunded_payment_id ? Number(row.refunded_payment_id) : undefined,
        srcAccId: row.src_acc_id || undefined,
        dstAccId: row.dst_acc_id,
        note: row.note,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    });
}

export async function createTransaction(
    data: Partial<Transaction>,
    conn: Knex
): Promise<Transaction> {
    const [row] = await conn("transactions")
        .insert({
            region: data.region,
            order_id: data.orderId,
            provider_id: data.providerId,
            method: data.method,
            transaction_type: data.transactionType,
            status: data.status,
            amount: data.amount,
            currency: data.currency,
            provider_reference_id: data.providerReferenceId,
            idempotency_key: data.idempotencyKey,
            is_refunded: data.isRefunded ?? false,
            refunded_payment_id: data.refundedPaymentId,
            src_acc_id: data.srcAccId ?? null,
            dst_acc_id: data.dstAccId,
            note: data.note,
            created_at: data.createdAt || new Date(),
            updated_at: data.updatedAt || new Date(),
        })
        .returning(TRANSACTION_COLUMNS);

    return toTransactionEntity(row);
}

export async function findTransactionById(
    id: number,
    conn: Knex
): Promise<Transaction | undefined> {
    const row = await conn("transactions").select(TRANSACTION_COLUMNS).where("id", id).first();
    return row ? toTransactionEntity(row) : undefined;
}

export async function findTransactionByProviderRef(
    providerRef: string,
    conn: Knex
): Promise<Transaction | undefined> {
    const row = await conn("transactions")
        .select(TRANSACTION_COLUMNS)
        .where("provider_reference_id", providerRef)
        .first();
    return row ? toTransactionEntity(row) : undefined;
}

export async function findTransactionsByOrderId(
    orderId: number,
    conn: Knex
): Promise<Transaction[]> {
    const rows = await conn("transactions")
        .select(TRANSACTION_COLUMNS)
        .where("order_id", orderId)
        .orderBy("id", "asc");
    return rows.map(toTransactionEntity);
}

export async function updateTransactionStatus(
    id: number,
    status: TransactionStatus,
    extra: Partial<Transaction> = {},
    conn: Knex
): Promise<Transaction | undefined> {
    const payload: Record<string, any> = {
        status,
        updated_at: new Date(),
    };
    if (extra.isRefunded !== undefined) payload.is_refunded = extra.isRefunded;
    if (extra.providerReferenceId) payload.provider_reference_id = extra.providerReferenceId;
    if (extra.note) payload.note = extra.note;

    const [row] = await conn("transactions").where("id", id).update(payload).returning(TRANSACTION_COLUMNS);
    return row ? toTransactionEntity(row) : undefined;
}
