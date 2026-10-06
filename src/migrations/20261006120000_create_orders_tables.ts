import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        CREATE TABLE IF NOT EXISTS idempotency_keys (
            key TEXT PRIMARY KEY,
            method TEXT NOT NULL,
            path TEXT NOT NULL,
            request_hash TEXT NOT NULL,
            status_code INT NOT NULL,
            response_body JSONB NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMP NOT NULL
        );

        CREATE TABLE IF NOT EXISTS orders (
            id BIGSERIAL PRIMARY KEY,
            public_id UUID NOT NULL DEFAULT gen_random_uuid(),
            region TEXT NOT NULL,
            restaurant_id BIGINT NOT NULL,
            branch_id BIGINT NOT NULL,
            customer_id BIGINT NOT NULL,
            customer_address_id BIGINT NOT NULL,
            delivery_lat DECIMAL(10, 8) NOT NULL,
            delivery_lng DECIMAL(11, 8) NOT NULL,
            delivery_address_text_snapshot TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN (
                'payment_pending',
                'placed',
                'accepted',
                'preparing',
                'ready_for_pickup',
                'out_for_delivery',
                'delivered',
                'cancelled',
                'rejected'
            )),
            payment_method TEXT NOT NULL CHECK(payment_method IN ('online', 'cod')),
            subtotal BIGINT NOT NULL,
            delivery_fee BIGINT NOT NULL,
            service_fee BIGINT NOT NULL,
            total_amount BIGINT NOT NULL,
            currency TEXT NOT NULL CHECK(currency IN ('EGP', 'SAR', 'USD')),
            delivery_agent_id BIGINT NULL,
            assigned_at TIMESTAMP NULL,
            accepted_at TIMESTAMP NULL,
            picked_at TIMESTAMP NULL,
            delivered_at TIMESTAMP NULL,
            cancelled_at TIMESTAMP NULL,
            cancel_reason TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

            CONSTRAINT uq_orders_public_id UNIQUE (public_id)
        );

        -- Query-driven indexes
        -- supports GET /api/orders/:publicId
        CREATE INDEX IF NOT EXISTS idx_orders_public_id ON orders(public_id);
        -- supports customer order history: GET /api/orders/my-orders
        CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id, created_at DESC);
        -- supports restaurant live orders feed: GET /api/orders?branchId=...&status=...
        CREATE INDEX IF NOT EXISTS idx_orders_branch_status ON orders(branch_id, status, created_at DESC);
        -- supports restaurant owner revenue reporting: GET /api/orders?restaurantId=...
        CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id, created_at DESC);
        -- supports delivery agent active task lookup: GET /api/deliveries/active
        CREATE INDEX IF NOT EXISTS idx_orders_agent_status ON orders(delivery_agent_id, status) WHERE delivery_agent_id IS NOT NULL;
        -- supports region-level order dispatching
        CREATE INDEX IF NOT EXISTS idx_orders_region_status ON orders(region, status, created_at);

        CREATE TABLE IF NOT EXISTS order_items (
            id BIGSERIAL PRIMARY KEY,
            order_id BIGINT NOT NULL,
            product_id BIGINT NOT NULL,
            quantity INT NOT NULL CHECK(quantity > 0),
            unit_price_snapshot BIGINT NOT NULL,
            subtotal BIGINT NOT NULL,
            name_snapshot TEXT NOT NULL,
            image_url_snapshot TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),

            CONSTRAINT fk_order_items_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        );

        -- supports batch item preloading by order_id to prevent N+1
        CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.raw(`
        DROP TABLE IF EXISTS order_items;
        DROP TABLE IF EXISTS orders;
        DROP TABLE IF EXISTS idempotency_keys;
    `);
}
