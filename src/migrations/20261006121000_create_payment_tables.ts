import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        CREATE TABLE IF NOT EXISTS payment_providers (
            id BIGSERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            priority SMALLINT NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        INSERT INTO payment_providers (name, is_enabled, priority)
        VALUES ('kashier', TRUE, 1), ('cod', TRUE, 2)
        ON CONFLICT (name) DO NOTHING;

        CREATE TABLE IF NOT EXISTS transactions (
            id BIGSERIAL PRIMARY KEY,
            region TEXT NOT NULL,
            order_id BIGINT NULL,
            provider_id BIGINT NULL,
            method TEXT NOT NULL CHECK(method IN ('online', 'cod', 'internal_balance', 'bank_transfer')),
            transaction_type TEXT NOT NULL CHECK(transaction_type IN (
                'payment',
                'refund',
                'payout',
                'commission',
                'settlement'
            )),
            status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'failed', 'cancelled')),
            amount BIGINT NOT NULL,
            currency TEXT NOT NULL CHECK(currency IN ('EGP', 'SAR', 'USD')),
            provider_reference_id TEXT NULL,
            idempotency_key TEXT NULL,
            is_refunded BOOLEAN NOT NULL DEFAULT FALSE,
            refunded_payment_id BIGINT NULL,
            src_acc_id TEXT NULL,
            dst_acc_id TEXT NOT NULL,
            note TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

            CONSTRAINT fk_transactions_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
            CONSTRAINT fk_transactions_provider_id FOREIGN KEY (provider_id) REFERENCES payment_providers(id) ON DELETE RESTRICT,
            CONSTRAINT fk_transactions_refunded_payment_id FOREIGN KEY (refunded_payment_id) REFERENCES transactions(id)
        );

        -- supports querying payments for an order
        CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);
        -- supports idempotent webhook deduplication
        CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_provider_ref ON transactions(provider_reference_id) WHERE provider_reference_id IS NOT NULL;
        -- supports restaurant balance reconciliation and payout history
        CREATE INDEX IF NOT EXISTS idx_transactions_dst_acc ON transactions(dst_acc_id, transaction_type, created_at DESC);
        -- supports idempotency key lookup
        CREATE INDEX IF NOT EXISTS idx_transactions_idempotency_key ON transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.raw(`
        DROP TABLE IF EXISTS transactions;
        DROP TABLE IF EXISTS payment_providers;
    `);
}
