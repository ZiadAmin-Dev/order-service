---
name: database-review
description: >-
  Audits Knex migrations, tables, constraints, indexes, sharding keys, transaction boundaries,
  and query patterns against database design specifications.
---

# Database Review Workflow

## When it applies
Applies whenever inspecting or modifying database migrations, repositories, and transactional logic.

## Verification Checklist
1. **Schema & Types**:
   - Primary keys use `BIGSERIAL` (represented as `BIGINT`).
   - Public IDs use `UUID` with unique constraint.
   - Money stored strictly as `BIGINT` minor units.
   - Region shard key `region TEXT NOT NULL` present on regional tables.
   - Enums implemented with `TEXT NOT NULL CHECK(col IN (...))`.
   - `src_acc_id` in `transactions` is nullable (`NULL`) for platform system-initiated disbursements.
2. **Indexes**:
   - Every read query pattern is supported by an index.
   - Indexes are query-driven with documented purpose.
   - Compound indexes order columns correctly (e.g., `(branch_id, status, created_at DESC)`).
3. **Transactions**:
   - Transactions are created and controlled at the service layer, not inside repository functions.
   - Pass Knex transaction handle `trx` into repository queries.
   - Ensure proper commit and rollback on errors.
