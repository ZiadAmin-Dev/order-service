export class OrderItem {
    id: number;
    orderId: number;
    productId: number;
    quantity: number;
    unitPriceSnapshot: number;
    subtotal: number;
    nameSnapshot: string;
    imageUrlSnapshot?: string;
    createdAt: Date;

    constructor(data: Partial<OrderItem>) {
        this.id = data.id!;
        this.orderId = data.orderId!;
        this.productId = data.productId!;
        this.quantity = data.quantity!;
        this.unitPriceSnapshot = data.unitPriceSnapshot!;
        this.subtotal = data.subtotal!;
        this.nameSnapshot = data.nameSnapshot!;
        this.imageUrlSnapshot = data.imageUrlSnapshot;
        this.createdAt = data.createdAt ?? new Date();
    }
}
