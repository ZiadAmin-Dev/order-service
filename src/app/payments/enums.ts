export enum TransactionType {
    PAYMENT = "payment",
    REFUND = "refund",
    PAYOUT = "payout",
    COMMISSION = "commission",
    SETTLEMENT = "settlement",
}

export enum TransactionStatus {
    PENDING = "pending",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
}

export enum PaymentMethodType {
    ONLINE = "online",
    COD = "cod",
    INTERNAL_BALANCE = "internal_balance",
    BANK_TRANSFER = "bank_transfer",
}
