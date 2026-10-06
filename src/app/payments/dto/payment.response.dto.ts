import { Transaction } from "../entity/transaction.entity";
import { TransactionType, TransactionStatus, PaymentMethodType } from "../enums";
import { Currency } from "../../orders/enums";

export class PaymentSessionResponseDTO {
    sessionId!: string;
    checkoutUrl!: string;
    orderPublicId!: string;

    static from(sessionId: string, checkoutUrl: string, orderPublicId: string): PaymentSessionResponseDTO {
        const dto = new PaymentSessionResponseDTO();
        dto.sessionId = sessionId;
        dto.checkoutUrl = checkoutUrl;
        dto.orderPublicId = orderPublicId;
        return dto;
    }
}

export class TransactionResponseDTO {
    id!: number;
    orderId?: number;
    method!: PaymentMethodType;
    transactionType!: TransactionType;
    status!: TransactionStatus;
    amount!: number; // minor units
    currency!: Currency;
    createdAt!: string;

    static from(tx: Transaction): TransactionResponseDTO {
        const dto = new TransactionResponseDTO();
        dto.id = Number(tx.id);
        dto.orderId = tx.orderId ? Number(tx.orderId) : undefined;
        dto.method = tx.method;
        dto.transactionType = tx.transactionType;
        dto.status = tx.status;
        dto.amount = Number(tx.amount);
        dto.currency = tx.currency;
        dto.createdAt = tx.createdAt instanceof Date ? tx.createdAt.toISOString() : new Date(tx.createdAt).toISOString();
        return dto;
    }
}
