# QuickBite `order-service` — Implementation vs. Requirement Audit Matrix

This document provides a comprehensive audit of the current `order-service` implementation against system design documents, API contracts, endpoint configurations, database specifications, and `core-service` reference patterns.

**Audit Status Reference:**
- `COMPLETE`: Fully implemented, adheres to contracts, tested and verified.
- `PARTIAL`: Partially built, has missing functions, wiring, or edge handling.
- `MISSING`: Entirely absent from code or configurations.
- `INCORRECT`: Implemented in a way that violates specifications or causes build/runtime failures.
- `CONTRADICTORY`: Code conflicts with documented requirements or core-service conventions.
- `NEEDS VERIFICATION`: Implemented but unverified due to lack of automated tests.

---

## 1. Application Lifecycle & Bootstrapping

| Field | Detail |
| --- | --- |
| **Requirement** | Express 5 Application Factory, Master Route Mount, Server Lifecycle & Graceful Shutdown |
| **Source** | `docs/system-design.md`, `package.json`, `core-service/src/app.ts`, `core-service/src/server.ts` |
| **Expected behavior** | `createApp()` configures Helmet, CORS, CookieParser, JSON body parser (10mb), correlation ID, master router `/api`, error handler. `server.ts` creates HTTP server, attaches WebSockets on `/ws`, listens on `env.PORT`, handles SIGINT/SIGTERM with graceful DB/Redis/RabbitMQ/server cleanup. |
| **Current implementation** | `src/app.ts`, `src/server.ts`, and `src/routes.ts` do NOT exist in the repository! |
| **Status** | **MISSING** |
| **Missing pieces** | `src/app.ts`, `src/server.ts`, `src/routes.ts`. |
| **Incorrect pieces** | `package.json` scripts (`"dev": "tsx watch src/server.ts"`, `"start": "node dist/server.js"`) fail immediately because entry files are absent. |
| **Required changes** | Create `src/app.ts`, `src/routes.ts`, and `src/server.ts` following `core-service` patterns while mounting all domain modules and WebSocket gateway. |
| **Verification method** | Start server via tsx/node, execute HTTP request to `/api/health`, send SIGINT, verify graceful shutdown. |

---

## 2. Dependency Injection Architecture

| Field | Detail |
| --- | --- |
| **Requirement** | Complete DI Container with TSyringe tokens, registrations, and resolution |
| **Source** | `CLAUDE.md`, `docs/folder-structure.md`, `core-service/src/lib/di/container.ts` |
| **Expected behavior** | All services (`OrderService`, `PaymentService`, `DeliveryService`, `AgentService`, `FinanceService`), controllers, and infrastructure providers are registered as singletons/instances in `src/lib/di/container.ts` using `TOKENS` symbols from `src/lib/di/tokens.ts`. Controllers resolved from container in router files. |
| **Current implementation** | `src/lib/di/tokens.ts` exists, but `src/lib/di/container.ts` is MISSING. All routes and middlewares (`orders.routes.ts`, `deliveries.routes.ts`, `withCache.ts`, `idempotency.ts`) attempt to import `container` from `../../lib/di/container` causing build crashes. |
| **Status** | **MISSING / INCORRECT** |
| **Missing pieces** | `src/lib/di/container.ts` with complete singleton registrations for all services, controllers, logger, cache, kashier client, core client, and message broker. |
| **Incorrect pieces** | Broken imports in 6 files targeting non-existent `container.ts`. |
| **Required changes** | Implement `src/lib/di/container.ts` registering all tokens; update all routers and middlewares to resolve cleanly. |
| **Verification method** | `npm run build` succeeds; container resolves all tokens without error on startup. |

---

## 3. Database Schema, Migrations & Query Indexes

| Field | Detail |
| --- | --- |
| **Requirement** | Sharded schema for orders, order items, transactions, payment providers, agent presence, agent earnings, restaurant balances, idempotency keys |
| **Source** | `docs/database-design.md`, `System Design/img.png` (ER diagram) |
| **Expected behavior** | Schema defines: `orders` (UUID `public_id`, `BIGINT` minor units, `region`, status checks), `order_items` (`BIGINT` minor units, cascading delete), `payment_providers`, `transactions` (`BIGINT` minor units, nullable `src_acc_id` for system payouts, unique provider ref), `restaurant_balances` (`BIGINT` running balance), `agent_presence` (geospatial coordinates, availability), `agent_earnings`, `idempotency_keys`. Query-driven indexes matching access patterns. |
| **Current implementation** | Migrations exist in `src/migrations/`: `create_orders_tables.ts`, `create_payment_tables.ts`, `create_deliveries_and_agents_tables.ts`, `create_restaurant_finance_tables.ts`. Minor units used, constraints defined, indexes created. `agent_presence` has `idx_agent_presence_avail`. `transactions` has unique partial index on `provider_reference_id`. |
| **Status** | **PARTIAL / NEEDS VERIFICATION** |
| **Missing pieces** | Automated migration tests across regional databases (`eg`, `ksa`). Verification of composite indexes against live query plans. |
| **Incorrect pieces** | `src_acc_id` is nullable in DB migration (correct), but in `delivery.service.ts` direct raw SQL insert passes `restaurantId` rather than validating source semantics. |
| **Required changes** | Add migration runner helper and migration execution tests. Ensure repository and service queries strictly match table schemas. |
| **Verification method** | Run Knex migrations against test database; verify tables, columns, constraints, and indexes. |

---

## 4. Multi-Region Sharding Architecture

| Field | Detail |
| --- | --- |
| **Requirement** | Sharding by Region (`eg`, `ksa`), dynamic shard resolution, zero cross-shard queries |
| **Source** | `CLAUDE.md` Sec 6, `docs/system-design.md` Sec 3, `src/lib/sharding/` |
| **Expected behavior** | `regionResolver` extracts region from `?region=`, `X-Region` header, or cookie. `db(region)` returns region-specific Knex pool. Cross-shard joins are forbidden. Admin `region="all"` handled via application-tier aggregation. |
| **Current implementation** | `shards.ts`, `knex.ts`, `regions.ts`, `region-resolver.ts` implemented. `db(region)` pool caching in Map. |
| **Status** | **COMPLETE** |
| **Missing pieces** | Tests verifying shard connection isolation and error handling for unconfigured regions. |
| **Incorrect pieces** | None detected. |
| **Required changes** | Write integration tests verifying region resolution and shard pool isolation. |
| **Verification method** | Unit test `regionResolver` with queries, headers, and defaults; verify `db("eg")` and `db("ksa")` instantiate distinct connection pools. |

---

## 5. Orders Domain Module

| Field | Detail |
| --- | --- |
| **Requirement** | Order Placement, Calculation in Minor Units, Snapshotting, Finite State Machine, History & Feed Queries, Response DTOs |
| **Source** | `endpoint-config/orders.json`, `docs/business-logic/orders.md`, `docs/api-contracts.md` |
| **Expected behavior** | `POST /api/orders` verifies branch active/accepting, verifies address, batch validates products via core, calculates subtotal, delivery fee, service fee in minor units, executes transaction, snapshots items, returns `OrderResponseDTO` (status 201). Supports `GET /api/orders/:publicId`, `GET /api/orders/my-orders`, `GET /api/orders?branchId=...`, `PATCH /api/orders/:publicId/status`. |
| **Current implementation** | `OrderService`, `OrderController`, `orders.repo.ts`, `orders.routes.ts`, DTOs implemented. FSM transitions enforced with optimistic concurrency. Batch item loading prevents N+1 queries. |
| **Status** | **PARTIAL / INCORRECT** |
| **Missing pieces** | Endpoint config lists `GET /api/orders` (query by `branchId`, `status`, cursor pagination), but `orders.routes.ts` mounted it at `GET /branch/:branchId`. Route mismatch with `endpoint-config/orders.json`. |
| **Incorrect pieces** | Express 5 typing errors in controller: `req.params.publicId` typed as `string | string[]` causing type errors when passed to functions expecting `string`. |
| **Required changes** | Harmonize `orders.routes.ts` routes with `endpoint-config/orders.json`: mount `GET /` with query filters and permissions, support `GET /:publicId`. Cast/validate params as strings. |
| **Verification method** | Automated unit and integration tests for order placement, state transitions, FSM illegal transitions (409), customer cancellation, and DTO structure. |

---

## 6. Payments Domain Module (Kashier v3 + COD)

| Field | Detail |
| --- | --- |
| **Requirement** | Kashier v3 Payment Session Generation, Webhook HMAC Verification, Idempotency, COD Flow, Transaction Ledger |
| **Source** | `endpoint-config/payments.json`, `docs/business-logic/payments.md`, `docs/api-contracts.md` |
| **Expected behavior** | `POST /api/payments/init` initializes Kashier session for online order, logs pending transaction. `POST /api/payments/webhook` verifies HMAC SHA256 signature using `KASHIER_SECRET_KEY`, deduplicates idempotently via `provider_reference_id`, transitions order to `placed` on SUCCESS or `cancelled` on FAILED, emits WebSockets. |
| **Current implementation** | `KashierClient` implements HMAC calculation and signature check. `PaymentService` implements session creation, webhook processing, transaction ledgering. |
| **Status** | **INCORRECT / PARTIAL** |
| **Missing pieces** | Response DTO for webhook: `payments.routes.ts` returns ad-hoc JSON instead of following Response DTO envelope. Missing refund processing service method. |
| **Incorrect pieces** | `payment.service.ts` imports non-existent `orderNotFoundError` from `../errors`. Broken relative imports (`../orders/...` instead of `../../orders/...`). Missing webhook raw body preservation for exact HMAC verification. |
| **Required changes** | Fix all import paths in `payment.service.ts` and `payments.routes.ts`. Export or properly import `orderNotFoundError`. Ensure webhook handler verifies signature reliably and returns consistent Response DTO. |
| **Verification method** | Unit tests with valid and forged webhook HMAC signatures, duplicate webhook submissions, and session initialization. |

---

## 7. Deliveries Domain Module

| Field | Detail |
| --- | --- |
| **Requirement** | Delivery Assignment (Manual & Proximity), Pickup, Fulfillment & Atomic Financial Settlement |
| **Source** | `endpoint-config/deliveries.json`, `docs/business-logic/deliveries.md`, `docs/api-contracts.md` |
| **Expected behavior** | `POST /api/deliveries/:orderPublicId/assign` assigns agent with RBAC `orders:delivery:manual_assign`. `PATCH /:orderPublicId/pickup` sets `picked_at` and `out_for_delivery`. `PATCH /:orderPublicId/delivered` sets `delivered_at`, records `agent_earnings`, deducts platform commission, credits `restaurant_balances`, completes COD payment in single atomic transaction. |
| **Current implementation** | `DeliveryService` implements manual assign, pickup, and fulfill. But it lacks a dedicated repository or entity and performs ad-hoc raw SQL queries touching `restaurant_balances`, `agent_earnings`, `transactions`. Import paths in controller, DTO, and service are broken. |
| **Status** | **INCORRECT / PARTIAL** |
| **Missing pieces** | Proximity auto-assignment helper (querying Redis `GEOSEARCH`). Dedicated delivery repository functions rather than direct raw SQL in service. |
| **Incorrect pieces** | Broken relative imports (`../orders/...` instead of `../../orders/...`). Express 5 param typing errors (`req.params.orderPublicId`). |
| **Required changes** | Fix import paths, encapsulate delivery queries in repository/functional modules, fix param typing, verify atomic settlement. |
| **Verification method** | Automated tests for manual assignment, pickup, fulfillment, settlement ledger verification, and unauthorized agent rejection. |

---

## 8. Delivery Agents & Presence Domain Module

| Field | Detail |
| --- | --- |
| **Requirement** | Hot Redis Geolocation & Heartbeat Tracking, Cold PostgreSQL Durability, Earnings Ledger Query |
| **Source** | `endpoint-config/agents.json`, `docs/business-logic/agents.md`, `docs/api-contracts.md` |
| **Expected behavior** | `POST /api/agents/me/presence` updates Redis hash `presence:agent:<id>` (30s TTL) and `geo:agents:<region>` geospatial set, flushes durable state to `agent_presence`. `GET /api/agents/me/earnings` returns agent earnings summary and recent earnings using Response DTO. |
| **Current implementation** | `AgentService` implements Redis hash + geoadd update and DB upsert. `AgentController`, DTOs, and repo exist. |
| **Status** | **INCORRECT / PARTIAL** |
| **Missing pieces** | Redis client dependency injection: `AgentService` injects `TOKENS.CacheProvider` expecting `RedisCacheProvider`, needs proper interface/method alignment. |
| **Incorrect pieces** | `agents.repo.ts`: Knex raw binding error with undefined values (`lastLat`, `lastLng`). Express 5 param/cookie typing. Broken container import in `agents.routes.ts`. |
| **Required changes** | Fix `agents.repo.ts` raw query bindings with `?? null`. Fix container import. Ensure Redis geospatial queries handle fallback gracefully. |
| **Verification method** | Automated tests for presence update, geospatial lookup, earnings calculation, and DTO formatting. |

---

## 9. Restaurant Finance Domain Module

| Field | Detail |
| --- | --- |
| **Requirement** | Running Balances, Pessimistic Locking, Admin Payout Recording (`src_acc_id = NULL`), Settlement History |
| **Source** | `endpoint-config/finance.json`, `docs/business-logic/restaurant-finance.md`, `docs/database-design.md` |
| **Expected behavior** | `GET /api/finance/restaurants/:restaurantId/balance` returns current balance. `POST /api/finance/restaurants/:restaurantId/payouts` (Admin only) locks balance via `FOR UPDATE`, checks sufficient balance, inserts payout transaction with `src_acc_id = NULL`, debits balance, returns `PayoutResponseDTO` (status 201). |
| **Current implementation** | DTOs, entity, errors, and `finance.repo.ts` exist. BUT `FinanceService`, `FinanceController`, and `finance.routes.ts` are COMPLETELY MISSING! |
| **Status** | **MISSING** |
| **Missing pieces** | `src/app/restaurant-finance/service/finance.service.ts`, `controller/finance.controller.ts`, `finance.routes.ts`. Router mounting in `routes.ts`. DI container registration. |
| **Incorrect pieces** | Broken import in `restaurant-balance.entity.ts` (`'../orders/enums'` instead of `'../../orders/enums'`). |
| **Required changes** | Implement `FinanceService`, `FinanceController`, `finance.routes.ts`. Wire DI tokens `FinanceService` and `FinanceController`. Mount routes at `/api/finance`. |
| **Verification method** | Automated tests for balance retrieval, payout deduction with pessimistic lock, payout exceeding balance rejection (400), and transaction record verification (`src_acc_id === null`). |

---

## 10. Real-Time WebSocket Gateway

| Field | Detail |
| --- | --- |
| **Requirement** | WebSocket Gateway on `/ws`, JWT Authentication, Scoped Room Subscriptions, Event Broadcasting |
| **Source** | `docs/system-design.md` Sec 8, `docs/business-logic/orders.md`, `src/lib/websocket/` |
| **Expected behavior** | WebSocket server attaches to HTTP server on `/ws`. Authenticates handshake via cookie `access_token` or `?token=`. Subscribes socket to authorized rooms (`customer:<id>`, `restaurant:<id>`, `branch:<id>`, `agent:<id>`, `admin:all`). Broadcasts order/delivery lifecycle events. |
| **Current implementation** | `ws-server.ts` and `ws-auth.ts` implemented. `wsGateway.broadcast()` called in services. |
| **Status** | **PARTIAL / NEEDS VERIFICATION** |
| **Missing pieces** | `wsGateway.attach(server)` is never invoked because `server.ts` is missing. |
| **Incorrect pieces** | None in core logic, but needs server integration. |
| **Required changes** | Call `wsGateway.attach(server)` inside `src/server.ts`. Add connection/authentication and room broadcast tests. |
| **Verification method** | WebSocket test client connects with valid/invalid JWT; verify authorized room event delivery and unauthorized rejection (4001). |

---

## 11. Authentication & RBAC

| Field | Detail |
| --- | --- |
| **Requirement** | JWT Verification matching `core-service`, RBAC middleware, Restaurant Membership, Branch Access Guards |
| **Source** | `CLAUDE.md` Sec 7, `docs/business-logic/rbac.md`, `core-service/src/lib/auth/` |
| **Expected behavior** | `authentication` middleware verifies `access_token` cookie or Bearer header against `ACCESS_SECRET`. `rbac({ resource, action })` permits `system_admin`, `owner` (for restaurant resources), and validates `branch_manager` / `staff` permissions. `requireRestaurantMember` and `requireBranchAccess` enforce strict tenant boundaries. `requireInternalApiKey` protects internal APIs. |
| **Current implementation** | `jwt.ts`, `guard.ts`, `rbac.ts`, `api-key.ts`, `errors.ts` implemented. Matches `core-service` structure. |
| **Status** | **COMPLETE / NEEDS VERIFICATION** |
| **Missing pieces** | Comprehensive unit tests for permission combinations and tenant isolation. |
| **Incorrect pieces** | None detected. |
| **Required changes** | Write test suite for all auth guards, role hierarchies, and membership checks. |
| **Verification method** | Run automated tests with various tokens: customer, delivery agent, restaurant owner, branch manager, staff, system admin, and untrusted attacker. |

---

## 12. Core-Service Client & Resilient Integration

| Field | Detail |
| --- | --- |
| **Requirement** | Internal HTTP client with exponential backoff, timeout, caching, and fallback handling |
| **Source** | `docs/core-service-integration.md`, `CLAUDE.md` Sec 3, `src/lib/core-client/` |
| **Expected behavior** | Resilient `CoreClient` queries `core-service` for branch details, address coordinates, batch product stock/prices with `X-Internal-API-Key`. Caches responses in Redis. Falls back safely when core-service endpoints are simulated or offline. |
| **Current implementation** | `core-client.ts` implements `request` with `withRetry`, caching for branches, and fallback mocks for local dev/testing. |
| **Status** | **COMPLETE** |
| **Missing pieces** | Unit tests verifying retry behavior and fallback execution. |
| **Incorrect pieces** | None detected. |
| **Required changes** | Add unit tests verifying `getBranch`, `validateProducts`, and `getCustomerAddress`. |
| **Verification method** | Mock HTTP fetch responses: verify 200 parsing, retry on network error, and 404 error throwing. |

---

## 13. Caching & Cache Invalidation

| Field | Detail |
| --- | --- |
| **Requirement** | Redis Cache-Aside middleware with TTL and jitter, Inbound RabbitMQ Consumer for cache eviction |
| **Source** | `docs/system-design.md` Sec 4 & 6, `src/lib/cache/`, `src/lib/core-events/` |
| **Expected behavior** | `withCache` intercepts GET requests, serves hits from Redis, saves responses with TTL and random jitter (10%). `CoreEventsConsumer` consumes `core.events` exchange and invalidates `core:product:<id>`, `core:branch:<id>`, `core:restaurant:<id>`, and `core:rbac:perms:<role>`. |
| **Current implementation** | `withCache.ts`, `RedisCacheProvider`, and `consumer.ts` implemented. Deduplication using Redis `SETNX`. |
| **Status** | **PARTIAL / INCORRECT** |
| **Missing pieces** | `withCache.ts` imports missing `container.ts`. Consumer startup lifecycle in `server.ts`. |
| **Incorrect pieces** | Broken `container` import in `withCache.ts`. |
| **Required changes** | Fix DI container import. Connect consumer in `server.ts`. Add cache unit tests. |
| **Verification method** | Unit test cache HIT/MISS behavior and RabbitMQ event cache eviction. |

---

## 14. Idempotency Engine

| Field | Detail |
| --- | --- |
| **Requirement** | Replay protection for mutating endpoints (`POST`, `PUT`, `PATCH`), Dual-layer Redis/DB idempotency |
| **Source** | `CLAUDE.md` Sec 6, `docs/system-design.md` Sec 4, `docs/database-design.md` Sec 2.8 |
| **Expected behavior** | Requests containing `Idempotency-Key` are cached in Redis (fast path) and durably logged in `idempotency_keys` table (durable path). Replayed requests return cached response body and `X-Idempotent-Replay: true`. |
| **Current implementation** | `src/lib/idempotency/idempotency.ts` checks Redis via `ICacheProvider`. It does NOT persist into `idempotency_keys` table. Broken import targeting missing `container.ts`. |
| **Status** | **PARTIAL / INCORRECT** |
| **Missing pieces** | PostgreSQL durable fallback in `idempotency_keys` table when Redis is unavailable or expired. |
| **Incorrect pieces** | Broken import targeting `container.ts`. |
| **Required changes** | Fix import of `container.ts`. Support durable database storage for idempotency keys. |
| **Verification method** | Automated tests for duplicate request replay, mismatched payload rejection, and header enforcement. |

---

## 15. Response DTO & Contract Compliance

| Field | Detail |
| --- | --- |
| **Requirement** | Explicit Response DTOs on every endpoint, Envelope consistency, Integer Minor Units |
| **Source** | `CLAUDE.md` Sec 5, `docs/api-contracts.md`, `endpoint-config/*.json` |
| **Expected behavior** | No controller returns raw entities. DTOs serialize monetary amounts as minor units + `currency`. Timestamps serialized as ISO 8601 strings. Public UUIDs exposed for orders. Responses wrapped via `sendSuccess` or `sendPaginated`. |
| **Current implementation** | Response DTOs created for Order, OrderItem, Payment, Delivery, Agent, Finance. Static `.from(...)` methods format dates, hide database serial IDs where UUIDs exist, and preserve minor units. |
| **Status** | **PARTIAL / NEEDS VERIFICATION** |
| **Missing pieces** | Verification across all endpoints to ensure zero entity leakage. |
| **Incorrect pieces** | Relative import errors in several DTO files (`delivery.response.dto.ts`, `transaction.entity.ts`, `restaurant-balance.entity.ts`). |
| **Required changes** | Fix all relative import paths. Validate every controller action passes DTOs to `sendSuccess` or `sendPaginated`. |
| **Verification method** | Assert response JSON schema in unit/integration tests for every controller. |

---

## 16. Automated Test Suite

| Field | Detail |
| --- | --- |
| **Requirement** | Automated test suite covering unit, integration, validation, authorization, and failure paths |
| **Source** | USER_REQUEST Sec 20 & 33, `package.json` |
| **Expected behavior** | `npm test` runs comprehensive tests via `tsx --test test/**/*.test.ts` covering happy paths, validation failures, authorization failures, missing resources, duplicate requests, and state machine integrity. |
| **Current implementation** | ZERO tests exist in the project! The `test/` directory is completely empty/missing. |
| **Status** | **MISSING** |
| **Missing pieces** | Complete test suite for all modules (`orders`, `payments`, `deliveries`, `agents`, `finance`, `auth`, `sharding`, `cache`, `money`). |
| **Incorrect pieces** | None (tests simply haven't been written yet). |
| **Required changes** | Create full suite of automated tests under `test/` using Node.js built-in test runner (`node:test`, `node:assert`). |
| **Verification method** | Run `npm test` and verify 100% test passing across all domains. |

---

## 17. Summary of Root Cause Action Items

1. **Foundations**:
   - Create `src/lib/di/container.ts` registering all tokens.
   - Create `src/routes.ts` mounting all module routers.
   - Create `src/app.ts` configuring Express app.
   - Create `src/server.ts` bootstrapping HTTP server, WebSocket, and shutdown signals.
2. **Compile Errors & Import Fixes**:
   - Fix all relative import paths in `deliveries`, `payments`, `restaurant-finance`.
   - Fix Knex raw binding issue in `agents.repo.ts`.
   - Fix Express 5 param type casting in controllers.
   - Export missing error `orderNotFoundError` where needed.
3. **Restaurant Finance Module**:
   - Implement `FinanceService`, `FinanceController`, and `finance.routes.ts`.
   - Wire DI tokens and mount in `routes.ts`.
4. **Deliveries Module**:
   - Create delivery repository / clean queries separating concerns from `DeliveryService`.
5. **Orders & Payments Endpoints**:
   - Harmonize `orders.routes.ts` and `payments.routes.ts` with `endpoint-config/*.json`.
6. **Testing**:
   - Write comprehensive automated tests across all modules.
