# CLAUDE.md — Order & Payments Service Guidelines

These rules apply to the **`order-service`** microservice of the **QuickBite** platform. They mirror the conventions of `core-service` while adding constraints specific to this service (DTO responses, region-sharded Postgres, Redis caching, sync/async I/O with `core-service`, WebSocket live updates, Kashier v3 payment integration).

When in doubt, look at how `core-service` does it and follow that exact pattern. Deviate **only** where an intentional deviation is documented.

---

## 1. Mission of this Service

This service owns the **transactional truth** of the platform:
- **Orders** — placement, lifecycle state machine, history, restaurant operations.
- **Payments** — online (Kashier v3 sessions & webhooks) and Cash on Delivery (COD), webhooks, refunds.
- **Deliveries** — assignment (proximity-based automatic & restaurant manual override), agent presence, lifecycle, agent earnings.
- **Restaurant finance** — running balances, automated commission deductions, and admin payouts (modeled as transactions).
- **Real-time updates** — WebSocket broadcast of order/delivery status changes.

It does **not** own: users, restaurants, branches, products, customer addresses, or the RBAC permissions catalog. Those live in `core-service` and are consumed sync (HTTP via `lib/core-client`) or via cached projections invalidated via async events.

---

## 2. Tech Stack (Locked — do not deviate)

| Concern | Library / Tool |
| --- | --- |
| Runtime | Node.js + TypeScript (strict, nodenext, decorators enabled) |
| HTTP framework | `express` v5 |
| Validation | `class-validator` + `class-transformer` |
| Dependency Injection | `tsyringe` (singletons via `TOKENS` symbols) |
| Env validation | `zod` |
| DB driver / query builder | `knex` over `pg` (No ORMs!) |
| Cache | `ioredis` via `RedisCacheProvider` |
| Auth | `jsonwebtoken` (access_token in cookies or header; matches core JWT) |
| Real-time WebSocket | `ws` or `socket.io` with Redis Pub/Sub broadcast |
| Messaging (Inbound) | `amqplib` (RabbitMQ topic exchange `core.events`) |
| Logging | Custom `Logger` structured JSON format (matches core) |
| Public Identifiers | `uuid` v4 for client-facing public IDs; bigserial internal PKs |
| Payments | Kashier v3 (Payment Sessions + Webhook signature verification) |

---

## 3. Architecture: `src/app`, `src/lib`, `src/pkg` Layering

```
       app/  ── may import lib, pkg
       lib/  ── may import pkg, env; may NOT import app/<module>/* (except via DI tokens at boot)
       pkg/  ── pure providers, NO imports from lib or app, NO env, NO global singletons
```

- **`src/pkg/`**: Framework-agnostic, app-agnostic, environment-agnostic utilities and providers (`RedisClient`, `KashierClient`, `money.ts`, `retry.ts`, `time.ts`). Never import `app` or `lib` into `pkg`.
- **`src/lib/`**: Application-aware infrastructure, glue, middleware, and drivers (`knex`, `sharding`, `redis`, `auth`, `rbac`, `core-client`, `websocket`, `logger`, `idempotency`, `error`, `http`).
- **`src/app/`**: Domain business modules (`orders`, `payments`, `deliveries`, `agents`, `restaurant-finance`, `health`).

---

## 4. Module File Conventions

Each domain module under `src/app/<module>/` strictly follows this skeleton:
1. **`entity/<module>.entity.ts`**: Plain TypeScript class, constructor takes `Partial<Entity>`. No ORM decorators, no SQL knowledge.
2. **`dto/<module>.request.dto.ts`**: `class-validator`-decorated input classes validated by `validateBody(DTO, req.body)`.
3. **`dto/<module>.response.dto.ts`**: Explicit response classes with static `.from(...)` mapping. **Entities are never returned directly.**
4. **`repository/<module>.repo.ts`**: Exported query functions (not repository classes!). Accepts optional `conn: Knex = db(region)`. Uses `<MODULE>_COLUMNS` projection and `toEntity(row)`.
5. **`service/<module>.service.ts`**: `@injectable()` service containing domain logic, transactions, state machines, and throwing `AppError`.
6. **`controller/<module>.controller.ts`**: `@injectable()` controller with arrow functions. Performs validation, calls service, maps to Response DTO, sends via `sendSuccess` or `sendPaginated`.
7. **`routes.ts`**: Mounts middlewares (`authentication`, `rbac`, `idempotency`, `requireRestaurantMember`, `requireBranchAccess`, `withCache`) and controller actions.
8. **`enums.ts`**: String-valued TypeScript enums matching database CHECK constraints.
9. **`errors.ts`**: Reusable module `AppError` instances with stable status codes and messages.
10. **`types.ts`**: Non-entity interfaces and helper types.

---

## 5. Response DTO Mandatory Requirement

Unlike `core-service` where raw entities were sometimes returned, in `order-service` **every HTTP response must be shaped by an explicit Response DTO**.
- Plain classes with `static from(...)` factory methods.
- Money fields returned as **integer minor units** alongside the `currency` string.
- Timestamps formatted as ISO 8601 strings (`Date.toISOString()`).
- No internal DB secrets, internal query metadata, or provider private tokens leaked.
- Public IDs exposed (UUIDs where defined, e.g. orders).

---

## 6. Sharding & Database Discipline

- **Shard key**: `region` / `country_code` (`eg`, `ksa`, etc.).
- Databases are physically isolated per region: `order_service_eg`, `order_service_ksa`.
- `db(region)` resolves the Knex instance for that region shard.
- Region resolved by: query `?region=`, then header `X-Region`, then cookie `region`.
- Cross-shard queries are forbidden on normal request paths.
- Migrations must be run deterministically across all configured region shards.
- **Money**: Stored strictly as `BIGINT` minor units (cents/piasters). Never floating-point numbers or decimals in memory.
- **Transactions**: Service owns the Knex transaction:
  ```ts
  const trx = await conn.transaction();
  try {
      await repoA(..., trx);
      await repoB(..., trx);
      await trx.commit();
  } catch (err) {
      await trx.rollback();
      throw err;
  }
  ```
- **Indexes**: Every index must be query-driven with a comment documenting the supported endpoint.
- **N+1 Prevention**: No row-by-row queries in loops. Use batching, `whereIn`, or SQL joins.

---

## 7. Security, Auth & RBAC

- JWT cookie `access_token` verified against `ACCESS_SECRET`. Same payload shape as `core-service`:
  `{ userId, email, role, restaurantId?, restaurantRole?, branchIds? }`.
- RBAC permissions check: `rbac({ resource, action })`.
  Permissions are validated against cached permissions fetched from `core-service`.
- Internal service-to-service communication: header `X-Internal-API-Key` validated against `CORE_INTERNAL_API_KEY`.
- Webhooks: Kashier v3 HMAC SHA256 signature verification. Untrusted payloads validated strictly before processing.

---

## 8. Development & Implementation Order

1. Orders
2. Payments (Kashier v3 + COD)
3. Deliveries
4. Agents & Presence
5. Restaurant Finance (Balances & Payouts)
6. WebSocket Real-time Integration
7. Archival System
