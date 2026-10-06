# QuickBite `order-service` — Agents & Presence Business Logic

## 1. Identity & Role Model

- Delivery agent accounts are authenticated via `core-service` with role `delivery_agent`.
- `order-service` verifies agent JWT credentials and regional claims (`region`).
- `order-service` does NOT replicate the agent user catalog; instead, it maintains dynamic operational state: presence, active assignment, and financial earnings.

---

## 2. Presence & Telemetry Store (Two-Tier Model)

### 2.1 Hot Tier: Redis Geospatial & Heartbeats
Agents stream periodic GPS telemetry (every 10–15 seconds) while online:
- **Presence Hash**: `presence:agent:<agentId>`
  - Fields: `lat`, `lng`, `isAvailable`, `lastSeenAt`, `activeOrderId`
  - TTL: 30 seconds (if an agent fails to send a heartbeat within 30 seconds, they are considered stale/offline).
- **Geospatial Index**: `geo:agents:<region>`
  - Updated via `GEOADD geo:agents:<region> <lng> <lat> <agentId>`.
  - When an agent toggles offline or times out, they are removed via `ZREM geo:agents:<region> <agentId>`.

### 2.2 Cold / Durable Tier: PostgreSQL (`agent_presence`)
- Updates to agent availability toggles (`online` vs `offline`) and periodic location checkpoints are flushed to the `agent_presence` PostgreSQL table.
- This provides durability across Redis restarts and provides fallback querying capabilities.

---

## 3. Agent Earnings Ledger (`agent_earnings`)

- Whenever an order is successfully marked `delivered`, the agent earns a delivery fee compensation.
- The earning is recorded immutably in `agent_earnings`:
  - `agent_id`: Identifier of fulfilling agent
  - `order_id`: Associated fulfilled order
  - `amount`: Minor units earned (e.g. 2500 for 25.00 EGP)
  - `currency`: Currency code matching the order
- The earnings history is read-only for delivery agents via `GET /api/agents/me/earnings`.
