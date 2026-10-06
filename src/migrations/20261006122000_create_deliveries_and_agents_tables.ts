import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        CREATE TABLE IF NOT EXISTS agent_presence (
            agent_id BIGINT PRIMARY KEY,
            region TEXT NOT NULL,
            is_available BOOLEAN NOT NULL DEFAULT FALSE,
            last_lat DECIMAL(10, 8) NULL,
            last_lng DECIMAL(11, 8) NULL,
            last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        -- supports fallback search for available agents
        CREATE INDEX IF NOT EXISTS idx_agent_presence_avail ON agent_presence(region, is_available, last_seen_at);

        CREATE TABLE IF NOT EXISTS agent_earnings (
            id BIGSERIAL PRIMARY KEY,
            region TEXT NOT NULL,
            agent_id BIGINT NOT NULL,
            order_id BIGINT NOT NULL,
            amount BIGINT NOT NULL,
            currency TEXT NOT NULL CHECK(currency IN ('EGP', 'SAR', 'USD')),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),

            CONSTRAINT fk_agent_earnings_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        );

        -- supports agent earnings history queries
        CREATE INDEX IF NOT EXISTS idx_agent_earnings_agent ON agent_earnings(agent_id, created_at DESC);
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.raw(`
        DROP TABLE IF EXISTS agent_earnings;
        DROP TABLE IF EXISTS agent_presence;
    `);
}
