export enum OrderStatus {
    PAYMENT_PENDING = "payment_pending",
    PLACED = "placed",
    ACCEPTED = "accepted",
    PREPARING = "preparing",
    READY_FOR_PICKUP = "ready_for_pickup",
    OUT_FOR_DELIVERY = "out_for_delivery",
    DELIVERED = "delivered",
    CANCELLED = "cancelled",
    REJECTED = "rejected",
}

export enum PaymentMethod {
    ONLINE = "online",
    COD = "cod",
}

export enum Currency {
    EGP = "EGP",
    SAR = "SAR",
    USD = "USD",
}
