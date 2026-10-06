import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        CREATE TABLE IF NOT EXISTS restaurant_balances (
            restaurant_id BIGINT PRIMARY KEY,
            region TEXT NOT NULL,
            balance BIGINT NOT NULL DEFAULT 0,
            currency TEXT NOT NULL CHECK(currency IN ('EGP', 'SAR', 'USD')),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_restaurant_balances_region ON restaurant_balances(region);
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.raw(`
        DROP TABLE IF EXISTS restaurant_balances;
    `);
}
