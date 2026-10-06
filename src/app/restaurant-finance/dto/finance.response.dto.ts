import { RestaurantBalance } from "../entity/restaurant-balance.entity";
import { Transaction } from "../../payments/entity/transaction.entity";
import { Currency } from "../../orders/enums";

export class RestaurantBalanceResponseDTO {
    restaurantId!: number;
    balance!: number; // minor units
    currency!: Currency;
    updatedAt!: string;

    static from(entity: RestaurantBalance): RestaurantBalanceResponseDTO {
        const dto = new RestaurantBalanceResponseDTO();
        dto.restaurantId = Number(entity.restaurantId);
        dto.balance = Number(entity.balance);
        dto.currency = entity.currency;
        dto.updatedAt = (entity.updatedAt || new Date()).toISOString();
        return dto;
    }
}

export class PayoutResponseDTO {
    transactionId!: number;
    restaurantId!: number;
    payoutAmount!: number; // minor units
    remainingBalance!: number; // minor units
    currency!: Currency;
    createdAt!: string;

    static from(
        tx: Transaction,
        remainingBalance: number
    ): PayoutResponseDTO {
        const dto = new PayoutResponseDTO();
        dto.transactionId = Number(tx.id);
        dto.restaurantId = Number(tx.dstAccId);
        dto.payoutAmount = Number(tx.amount);
        dto.remainingBalance = remainingBalance;
        dto.currency = tx.currency;
        dto.createdAt = (tx.createdAt || new Date()).toISOString();
        return dto;
    }
}
