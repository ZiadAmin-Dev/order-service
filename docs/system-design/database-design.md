# QuickBite `order-service` — Database Design Specification

## 1. Schema Principles & Core Conventions

The database design directly derives from the system ER diagram (`img.png`), the PRD, and QuickBite engineering conventions:
1. **Identifiers**: Internal primary keys use `BIGSERIAL` (represented as `BIGINT`). Public identifiers exposed to clients use `UUID v4` (`public_id`) on the `orders` table.
2. **Naming**: Tables are plural `snake_case`. Columns are `snake_case`. Booleans prefixed with `is_`.
3. **Monetary Values**: Stored strictly as `BIGINT` representing integer minor units (piasters in EGP, halalas in SAR, cents in USD). Floating-point and Decimal on hot math paths are prohibited.
4. **Enums & State**: Implemented as `TEXT NOT NULL CHECK (col IN (...))` matching PostgreSQL conventions used throughout QuickBite.
5. **Foreign Key Integrity**:
   - Intra-service FKs have explicit constraints (`fk_<table_name>_<column_name>`) and dedicated supporting indexes.
   - Cross-service references (`customer_id`, `restaurant_id`, `branch_id`, `product_id`) are logical identifiers referencing entities owned by `core-service`.
6. **Multi-Region Sharding**: Every sharded table contains `region TEXT NOT NULL` (`eg`, `ksa`, etc.).
7. **System-Initiated Transaction Semantics**: In `transactions`, `src_acc_id` is nullable (`NULL`) when the source of funds is the QuickBite platform itself (e.g. platform settlement or initial credit).

---

## 2. Relational Entity Definitions

### 2.1 Table: `orders`
Represents customer food orders and their full lifecycle.

```sql
CREATE TABLE orders (
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
    subtotal BIGINT NOT NULL,          -- Minor units
    delivery_fee BIGINT NOT NULL,      -- Minor units
    service_fee BIGINT NOT NULL,       -- Minor units
    total_amount BIGINT NOT NULL,      -- subtotal + delivery_fee + service_fee
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
```

#### Query-Driven Indexes for `orders`:
- `CREATE INDEX idx_orders_customer_id ON orders(customer_id, created_at DESC);`
  *Supports customer order history query (`GET /api/orders/my-orders`).*
- `CREATE INDEX idx_orders_branch_status ON orders(branch_id, status, created_at DESC);`
  *Supports restaurant live dashboard feed (`GET /api/orders?branchId=...&status=...`).*
- `CREATE INDEX idx_orders_restaurant_id ON orders(restaurant_id, created_at DESC);`
  *Supports restaurant owner financial and reporting queries.*
- `CREATE INDEX idx_orders_agent_status ON orders(delivery_agent_id, status) WHERE delivery_agent_id IS NOT NULL;`
  *Supports delivery agent active task lookups (`GET /api/deliveries/active`).*
- `CREATE INDEX idx_orders_region_status ON orders(region, status, created_at);`
  *Supports delivery auto-assignment polling for pending deliveries.*

---

### 2.2 Table: `order_items`
Immutable snapshots of products ordered at the time of checkout.

```sql
CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL CHECK(quantity > 0),
    unit_price_snapshot BIGINT NOT NULL,   -- Minor units
    subtotal BIGINT NOT NULL,              -- quantity * unit_price_snapshot
    name_snapshot TEXT NOT NULL,
    image_url_snapshot TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_order_items_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
```

#### Query-Driven Indexes for `order_items`:
- `CREATE INDEX idx_order_items_order_id ON order_items(order_id);`
  *Supports fetching all items for an order without N+1.*

---

### 2.3 Table: `payment_providers`
Registry of supported payment gateways.

```sql
CREATE TABLE payment_providers (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    priority SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

### 2.4 Table: `transactions`
Unified financial ledger for customer payments, refunds, restaurant payouts, platform commissions, and COD settlements.

```sql
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    region TEXT NOT NULL,
    order_id BIGINT NULL,                  -- Nullable for restaurant payouts and non-order adjustments
    provider_id BIGINT NULL,               -- Nullable for COD or system balance adjustments
    method TEXT NOT NULL CHECK(method IN ('online', 'cod', 'internal_balance', 'bank_transfer')),
    transaction_type TEXT NOT NULL CHECK(transaction_type IN (
        'payment',
        'refund',
        'payout',
        'commission',
        'settlement'
    )),
    status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'failed', 'cancelled')),
    amount BIGINT NOT NULL,                -- Minor units (always positive)
    currency TEXT NOT NULL CHECK(currency IN ('EGP', 'SAR', 'USD')),
    provider_reference_id TEXT NULL,       -- External session ID or transaction reference from Kashier
    idempotency_key TEXT NULL,
    is_refunded BOOLEAN NOT NULL DEFAULT FALSE,
    refunded_payment_id BIGINT NULL,
    src_acc_id TEXT NULL,                  -- NULL when source is the QuickBite platform system itself
    dst_acc_id TEXT NOT NULL,              -- Target entity identifier (e.g. restaurant_id, customer_id, provider)
    note TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_transactions_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    CONSTRAINT fk_transactions_provider_id FOREIGN KEY (provider_id) REFERENCES payment_providers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_transactions_refunded_payment_id FOREIGN KEY (refunded_payment_id) REFERENCES transactions(id)
);
```

#### Query-Driven Indexes for `transactions`:
- `CREATE INDEX idx_transactions_order_id ON transactions(order_id);`
  *Supports querying payments for a specific order.*
- `CREATE UNIQUE INDEX uq_transactions_provider_ref ON transactions(provider_reference_id) WHERE provider_reference_id IS NOT NULL;`
  *Prevents duplicate webhook processing from payment gateways.*
- `CREATE INDEX idx_transactions_dst_acc ON transactions(dst_acc_id, transaction_type, created_at DESC);`
  *Supports restaurant balance reconciliation and payout history.*
- `CREATE INDEX idx_transactions_idempotency_key ON transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;`
  *Supports durable idempotency lookups.*

---

### 2.5 Table: `restaurant_balances`
Real-time running balances for restaurant payout settlements.

```sql
CREATE TABLE restaurant_balances (
    restaurant_id BIGINT PRIMARY KEY,
    region TEXT NOT NULL,
    balance BIGINT NOT NULL DEFAULT 0,    -- Minor units (can be positive or zero)
    currency TEXT NOT NULL CHECK(currency IN ('EGP', 'SAR', 'USD')),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### Query-Driven Indexes for `restaurant_balances`:
- `CREATE INDEX idx_restaurant_balances_region ON restaurant_balances(region);`

---

### 2.6 Table: `agent_presence`
Durable persistence of delivery agent locations and online availability.

```sql
CREATE TABLE agent_presence (
    agent_id BIGINT PRIMARY KEY,
    region TEXT NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT FALSE,
    last_lat DECIMAL(10, 8) NULL,
    last_lng DECIMAL(11, 8) NULL,
    last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### Query-Driven Indexes for `agent_presence`:
- `CREATE INDEX idx_agent_presence_avail ON agent_presence(region, is_available, last_seen_at);`
  *Supports fallback querying of active delivery agents when Redis cache is cold.*

---

### 2.7 Table: `agent_earnings`
Immutable ledger of agent payouts for fulfilled deliveries.

```sql
CREATE TABLE agent_earnings (
    id BIGSERIAL PRIMARY KEY,
    region TEXT NOT NULL,
    agent_id BIGINT NOT NULL,
    order_id BIGINT NOT NULL,
    amount BIGINT NOT NULL,                -- Minor units earned for delivery
    currency TEXT NOT NULL CHECK(currency IN ('EGP', 'SAR', 'USD')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_agent_earnings_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
```

#### Query-Driven Indexes for `agent_earnings`:
- `CREATE INDEX idx_agent_earnings_agent ON agent_earnings(agent_id, created_at DESC);`
  *Supports agent earnings history queries.*

---

### 2.8 Table: `idempotency_keys`
Durable persistence for transactional endpoints ensuring replay protection against network retries.

```sql
CREATE TABLE idempotency_keys (
    key TEXT PRIMARY KEY,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    status_code INT NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);
```
