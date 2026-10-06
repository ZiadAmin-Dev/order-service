# QuickBite Order Service — Project Rules & Invariants

These rules are permanent invariants for `order-service`.

## 1. Workspace Boundaries
- `core-service/` is strictly **READ-ONLY**. Under no circumstances may files in `core-service/` be modified, renamed, created, or deleted.
- Never access or copy from `Quick Bite Final/`.
- All implementation must reside strictly within `order-service/`.

## 2. Layering Architecture (`pkg` / `lib` / `app`)
- **`src/pkg/`**: Framework-agnostic, app-agnostic pure providers (e.g. `RedisCacheProvider`, `KashierClient`, `money.ts`).
  - MUST NOT import anything from `src/lib/` or `src/app/`.
  - MUST NOT read `process.env` directly.
- **`src/lib/`**: Application-aware infrastructure, glue, middleware, and drivers (e.g. `knex`, `sharding`, `auth`, `rbac`, `core-client`, `di`, `websocket`).
  - May import `src/pkg/` and configuration from `src/lib/config/env`.
  - MUST NOT import domain entities, DTOs, or controllers from `src/app/`, except solely in `src/lib/di/container.ts` for startup registration.
- **`src/app/`**: Domain business modules (`orders`, `payments`, `deliveries`, `agents`, `restaurant-finance`, `health`).
  - May import `src/lib/` and `src/pkg/`.
  - Cross-module boundary: A domain module MUST NOT import another domain module's repository directly. Cross-module operations must flow through services or domain events.

## 3. Dependency Injection Discipline
- TSyringe is used for dependency injection.
- Singletons and instances are registered in `src/lib/di/container.ts` using `TOKENS` symbols.
- Controllers, services, and infrastructure providers are registered and injected via `@injectable()` and `@inject(TOKENS.<Name>)`.
- Routers resolve controllers from `container`.

## 4. Response DTO Mandatory Requirement
- Controllers must NEVER return database entities, raw Knex rows, or raw external gateway objects directly.
- Every HTTP response must be formatted using an explicit Response DTO with static `.from(...)` mapping.
- No database internal IDs (where public UUID exists), internal secrets, or provider tokens leaked.

## 5. Monetary Discipline
- All monetary amounts (subtotal, delivery fee, service fee, total amount, payouts, commissions, earnings) MUST be stored and manipulated strictly as **integer minor units** (e.g., piasters for EGP, halalas for SAR, cents for USD) as `bigint`/`number`.
- Floating-point representations and decimal arithmetic on calculations are prohibited.
- Response DTOs return integer minor units alongside an explicit `currency` string.

## 6. Database, Sharding & Query Discipline
- Database access uses Knex over PostgreSQL. No ORMs (Prisma, TypeORM, etc.).
- Multi-region sharding: Databases are physically isolated per region (`order_service_eg`, `order_service_ksa`).
  - `db(region)` resolves the Knex instance for that region shard.
  - Queries must be strictly scoped to the active request region. Zero cross-shard joins or queries on operational paths.
- Repositories are functional (exported query functions, not classes), use explicit column projections (`<MODULE>_COLUMNS`), and map rows to domain entities.
- Every production query must be supported by an index. No unbounded `SELECT *` queries.
- N+1 queries are strictly prohibited: use batching (`whereIn`) and SQL joins for related collections.

## 7. Transaction Integrity
- Knex transactions belong to the **service/business-operation level**, never started privately by repositories.
- Financial updates (order placement, payment completion, delivery fulfillment, commission deductions, restaurant balance credits, admin payouts) must be wrapped in atomic transactions with explicit commit/rollback.

## 8. Idempotency & Concurrency
- Unsafe mutating operations (order creation, payment initialization, webhooks, delivery assignment, payouts) must enforce idempotency.
- State machine transitions must use optimistic conditional updates (`WHERE id = :id AND status = :expectedStatus`) and throw 409 Conflict if rows affected is zero.
