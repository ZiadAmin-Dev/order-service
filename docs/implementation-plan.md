# QuickBite `order-service` — Implementation Plan

This plan outlines the incremental, testable delivery sequence for `order-service`.

---

## Phase 0: Foundations & Infrastructure Bootstrapping
- **Scope**:
  - `package.json`, `tsconfig.json`, build and test tooling.
  - Core app structure: `src/app.ts`, `src/server.ts`, `src/routes.ts`.
  - Infrastructure glue (`src/lib/`):
    - `config/env.ts`: Zod-validated environment config.
    - `logger/logger.ts`: JSON logger matching `core-service`.
    - `error/AppError.ts`, `errorHandler.ts`: Structured error handling.
    - `correlation/correlationId.ts`: UUID correlation ID propagation.
    - `validation/validate.ts`: `class-validator` pipeline.
    - `di/container.ts`, `tokens.ts`: TSyringe container setup.
    - `knex/`: Multi-region Knex manager (`db(region)`), connection pooling, migrations setup.
    - `sharding/`: Region resolver (`?region=`, `X-Region`, cookie).
    - `cache/`: Redis provider (`src/pkg/cache/redis.ts`) and `withCache` middleware.
    - `auth/`: JWT verification, `authentication` guard, `rbac` middleware, `requireRestaurantMember`, `requireBranchAccess`.
    - `idempotency/`: Redis + DB idempotency guard.
    - `core-client/`: Internal HTTP client with exponential backoff for `core-service`.
    - `messaging/`: RabbitMQ client and connection management (`amqplib`).
    - `core-events/`: RabbitMQ consumer for `core.events` cache invalidation.
    - `websocket/`: WebSocket server scaffold, authentication, room management.
  - Health endpoint: `GET /api/health`.
- **Acceptance Criteria**:
  - TypeScript compiles with zero errors under strict mode.
  - Service starts, logs cleanly, responds 200 OK on `/api/health`.

---

## Phase 1: Orders Domain Module
- **Scope**:
  - PostgreSQL migration for `orders` and `order_items` tables, plus `idempotency_keys`.
  - Domain entities: `Order`, `OrderItem`.
  - Request DTOs: `CreateOrderDTO`, `UpdateOrderStatusDTO`.
  - Response DTOs: `OrderResponseDTO`, `OrderItemResponseDTO`.
  - Repository: `orders.repo.ts` (functions for insert, findById, findByPublicId, findByCustomer, findByBranch, updateStatus, batch load items).
  - Service: `OrderService` (order placement calculation, state machine enforcement, stock and branch checks via core-client, transaction management).
  - Controller & Routes: `OrderController`, `orders.routes.ts`.
  - DI registration and master router mounting.
- **Acceptance Criteria**:
  - Unit/integration test verifies order creation, pricing math, item snapshotting, and legal state transitions.

---

## Phase 2: Payments Domain Module (Kashier v3 & COD)
- **Scope**:
  - PostgreSQL migration for `payment_providers` and `transactions` tables.
  - Kashier v3 client in `src/pkg/payments/kashier.ts` (sessions, webhook signature HMAC-SHA256 verification, refunds).
  - Entities: `Transaction`, `PaymentProvider`.
  - Request DTOs: `InitPaymentDTO`, `KashierWebhookDTO`.
  - Response DTOs: `PaymentSessionResponseDTO`, `TransactionResponseDTO`.
  - Repository: `payments.repo.ts`.
  - Service: `PaymentService` (session initiation, idempotent webhook handling, state transitions, refund issuance).
  - Controller & Routes: `PaymentController`, `payments.routes.ts`.
- **Acceptance Criteria**:
  - Webhook handles legitimate HMAC signature, rejects forgery with 401, handles duplicate delivery idempotently, updates order status.

---

## Phase 3: Deliveries Domain Module
- **Scope**:
  - Delivery repository queries on `orders`.
  - Service: `DeliveryService` (proximity agent dispatch via Redis Geo, manual restaurant assignment, agent acceptance/rejection, pickup, delivery fulfillment).
  - Atomic settlement on delivery: triggers restaurant balance credit and agent earnings.
  - Controller & Routes: `DeliveryController`, `deliveries.routes.ts`.
- **Acceptance Criteria**:
  - Concurrent assignment race condition tests pass. Delivery fulfillment triggers accurate financial effects.

---

## Phase 4: Agents & Presence Domain Module
- **Scope**:
  - PostgreSQL migration for `agent_presence` and `agent_earnings` tables.
  - Entities: `AgentPresence`, `AgentEarning`.
  - DTOs: `UpdatePresenceDTO`, `AgentEarningsResponseDTO`.
  - Repository: `agents.repo.ts`.
  - Service: `AgentService` (Redis telemetry updates, heartbeat expiration, earnings ledger).
  - Controller & Routes: `AgentController`, `agents.routes.ts`.
- **Acceptance Criteria**:
  - Stale agent presence expires within 30s. Agent can query their historical earnings.

---

## Phase 5: Restaurant Finance Domain Module
- **Scope**:
  - PostgreSQL migration for `restaurant_balances`.
  - Entities: `RestaurantBalance`.
  - DTOs: `RestaurantBalanceResponseDTO`, `CreatePayoutDTO`, `PayoutResponseDTO`.
  - Repository: `finance.repo.ts`.
  - Service: `FinanceService` (pessimistic locking on balance updates, commission calculations, admin payout recording, history).
  - Controller & Routes: `FinanceController`, `finance.routes.ts`.
- **Acceptance Criteria**:
  - Balance operations are atomic. Payout cannot exceed balance. System transaction sets `src_acc_id = NULL`.

---

## Phase 6: Real-Time WebSocket Events Wiring
- **Scope**:
  - Wire domain service events (`order:created`, `order:accepted`, `order:out_for_delivery`, `order:delivered`) to the WebSocket hub.
  - Redis Pub/Sub distribution across worker processes.
- **Acceptance Criteria**:
  - Authenticated sockets receive live status transitions for their authorized rooms.

---

## Phase 7: Cold Archival & Final Engineering Validation
- **Scope**:
  - Archival worker: moves orders older than the current calendar year to the regional archive database.
  - End-to-end integration and smoke testing.
  - Verification against all checklist items (No N+1, query-driven indexing, DTO integrity).
