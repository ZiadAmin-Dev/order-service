# QuickBite `order-service` — Folder Structure & Architecture Rules

## 1. Directory Tree Overview

```
order-service/
├── .agents/
│   └── skills/                   # Reusable agent procedures & playbooks
├── docs/                         # Architecture, schemas, contracts & business logic
│   ├── business-logic/           # Domain state machines and business rules
│   │   ├── agents.md
│   │   ├── deliveries.md
│   │   ├── orders.md
│   │   ├── payments.md
│   │   ├── rbac.md
│   │   └── restaurant-finance.md
│   ├── api-contracts.md
│   ├── core-service-integration.md
│   ├── database-design.md
│   ├── folder-structure.md
│   ├── implementation-plan.md
│   └── system-design.md
├── endpoint-config/              # Endpoint specifications, auth & parameter specs
│   ├── orders.endpoints.json
│   ├── payments.endpoints.json
│   ├── deliveries.endpoints.json
│   ├── agents.endpoints.json
│   └── finance.endpoints.json
├── play/                         # Safe sandbox for prototyping SQL, tests & scripts
├── src/
│   ├── app.ts                    # Express application factory
│   ├── server.ts                 # Server bootstrap & graceful shutdown lifecycle
│   ├── routes.ts                 # Master router mounting all module routers
│   ├── app/                      # Business/Domain modules
│   │   ├── agents/
│   │   ├── deliveries/
│   │   ├── health/
│   │   ├── orders/
│   │   ├── payments/
│   │   └── restaurant-finance/
│   ├── lib/                      # Application-aware infrastructure & glue
│   │   ├── auth/                 # Guards, JWT verification, RBAC middleware
│   │   ├── cache/                # Redis initialization & withCache decorator/middleware
│   │   ├── config/               # Zod-validated environment configuration
│   │   ├── core-client/          # Resilient HTTP client for core-service
│   │   ├── core-events/          # Inbound RabbitMQ consumer for cache invalidations
│   │   ├── correlation/          # X-Correlation-ID tracing middleware
│   │   ├── di/                   # TSyringe DI container and injection tokens
│   │   ├── error/                # AppError class and Express error handler
│   │   ├── http/                 # Response formatters and cursor pagination
│   │   ├── idempotency/          # Dual-layer Redis/DB idempotency middleware
│   │   ├── knex/                 # Sharded Knex connection manager
│   │   ├── logger/               # Structured JSON logger
│   │   ├── messaging/            # RabbitMQ lifecycle and DI binding
│   │   ├── sharding/             # Region resolver & shard router
│   │   ├── types/                # Ambient express typings
│   │   ├── validation/           # class-validator runner
│   │   └── websocket/            # WebSocket gateway and room broadcast hub
│   ├── pkg/                      # Pure, framework-agnostic utilities & providers
│   │   ├── cache/                # Redis cache provider interface & implementation
│   │   ├── messaging/            # amqplib RabbitMQ client abstraction
│   │   ├── payments/             # Kashier v3 client & signature verifier
│   │   └── utils/                # Pure helpers: money, time, retry
│   └── migrations/               # PostgreSQL migrations per region
├── .env.example
├── .gitignore
├── CLAUDE.md                     # Engineering constraints and conventions
├── package.json
└── tsconfig.json
```

---

## 2. Layering Boundaries & Import Rules

```
     ┌────────────────────────┐
     │      src/app/          │ ◄── Business Modules
     └───────────┬────────────┘
                 │ (may import lib and pkg)
                 ▼
     ┌────────────────────────┐
     │      src/lib/          │ ◄── Application Glue & Infrastructure
     └───────────┬────────────┘
                 │ (may import pkg, env; NEVER imports app/ except in di/container)
                 ▼
     ┌────────────────────────┐
     │      src/pkg/          │ ◄── Framework-Agnostic Reusable Providers
     └────────────────────────┘     (NO imports from lib, NO imports from app, NO env)
```

1. **`src/pkg/`**:
   - MUST NOT import anything from `src/lib` or `src/app`.
   - MUST NOT read `process.env` directly (parameters passed via constructors/options).
   - MUST NOT depend on Express, Knex, or HTTP framework concepts.
2. **`src/lib/`**:
   - May import `src/pkg/` and configuration from `src/lib/config/env`.
   - MUST NOT import domain entities, DTOs, or controllers from `src/app/` (with the sole exception of `src/lib/di/container.ts` which registers injectable tokens at startup).
3. **`src/app/`**:
   - Contains self-contained domain contexts (`orders`, `payments`, etc.).
   - Cross-module boundaries: Domain modules MUST NOT import another module's repository directly. Cross-module access must flow through services or domain events.
