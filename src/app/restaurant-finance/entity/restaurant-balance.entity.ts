import { Currency } from "../../orders/enums";

export class RestaurantBalance {
    restaurantId: number;
    region: string;
    balance: number; // minor units
    currency: Currency;
    updatedAt: Date;

    constructor(data: Partial<RestaurantBalance>) {
        this.restaurantId = data.restaurantId!;
        this.region = data.region!;
        this.balance = data.balance ?? 0;
        this.currency = data.currency!;
        this.updatedAt = data.updatedAt ?? new Date();
    }
}
