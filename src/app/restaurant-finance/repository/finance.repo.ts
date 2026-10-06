import { Knex } from "knex";
import { RestaurantBalance } from "../entity/restaurant-balance.entity";

export const RESTAURANT_BALANCE_COLUMNS = [
    "restaurant_id",
    "region",
    "balance",
    "currency",
    "updated_at",
];

function toBalanceEntity(row: any): RestaurantBalance {
    return new RestaurantBalance({
        restaurantId: Number(row.restaurant_id),
        region: row.region,
        balance: Number(row.balance),
        currency: row.currency,
        updatedAt: new Date(row.updated_at),
    });
}

export async function findRestaurantBalance(
    restaurantId: number,
    conn: Knex
): Promise<RestaurantBalance | undefined> {
    const row = await conn("restaurant_balances")
        .select(RESTAURANT_BALANCE_COLUMNS)
        .where("restaurant_id", restaurantId)
        .first();
    return row ? toBalanceEntity(row) : undefined;
}

export async function lockRestaurantBalance(
    restaurantId: number,
    conn: Knex
): Promise<RestaurantBalance | undefined> {
    const row = await conn("restaurant_balances")
        .select(RESTAURANT_BALANCE_COLUMNS)
        .where("restaurant_id", restaurantId)
        .forUpdate()
        .first();
    return row ? toBalanceEntity(row) : undefined;
}

export async function updateRestaurantBalance(
    restaurantId: number,
    newBalance: number,
    conn: Knex
): Promise<RestaurantBalance> {
    const [row] = await conn("restaurant_balances")
        .where("restaurant_id", restaurantId)
        .update({
            balance: newBalance,
            updated_at: new Date(),
        })
        .returning(RESTAURANT_BALANCE_COLUMNS);

    return toBalanceEntity(row);
}
