import { TransactionType, TransactionStatus, PaymentMethodType } from "../enums";
import { Currency } from "../../orders/enums";

export class Transaction {
    id: number;
    region: string;
    orderId?: number;
    providerId?: number;
    method: PaymentMethodType;
    transactionType: TransactionType;
    status: TransactionStatus;
    amount: number; // minor units
    currency: Currency;
    providerReferenceId?: string;
    idempotencyKey?: string;
    isRefunded: boolean;
    refundedPaymentId?: number;
    srcAccId?: string; // Nullable when source is QuickBite internal system
    dstAccId: string;
    note?: string;
    createdAt: Date;
    updatedAt: Date;

    constructor(data: Partial<Transaction>) {
        this.id = data.id!;
        this.region = data.region!;
        this.orderId = data.orderId;
        this.providerId = data.providerId;
        this.method = data.method!;
        this.transactionType = data.transactionType!;
        this.status = data.status!;
        this.amount = data.amount!;
        this.currency = data.currency!;
        this.providerReferenceId = data.providerReferenceId;
        this.idempotencyKey = data.idempotencyKey;
        this.isRefunded = data.isRefunded ?? false;
        this.refundedPaymentId = data.refundedPaymentId;
        this.srcAccId = data.srcAccId;
        this.dstAccId = data.dstAccId!;
        this.note = data.note;
        this.createdAt = data.createdAt ?? new Date();
        this.updatedAt = data.updatedAt ?? new Date();
    }
}
