export class PaymentProvider {
    id: number;
    name: string;
    isEnabled: boolean;
    priority: number;
    createdAt: Date;
    updatedAt: Date;

    constructor(data: Partial<PaymentProvider>) {
        this.id = data.id!;
        this.name = data.name!;
        this.isEnabled = data.isEnabled ?? true;
        this.priority = data.priority ?? 1;
        this.createdAt = data.createdAt ?? new Date();
        this.updatedAt = data.updatedAt ?? new Date();
    }
}
