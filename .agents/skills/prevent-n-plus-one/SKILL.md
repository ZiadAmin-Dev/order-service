---
name: prevent-n-plus-one
description: >-
  Audits and verifies that repository queries and service data fetching do not execute
  iterative loops of database queries for related entities (such as orders and order items).
---

# Preventing N+1 Queries in QuickBite Services

## When it applies
Applies whenever implementing list, detail, or batch repository queries that retrieve entities with related children (e.g. Orders with OrderItems, Restaurants with Branches).

## Constraints & Requirements
1. Never query child rows in a loop inside services or controllers.
2. In Knex repositories, prefer:
   - SQL JOIN when child cardinality is 1:1 or projection is flat.
   - Batching using `.whereIn('parent_id', parentIds)` when child cardinality is 1:N, followed by in-memory grouping in the repository or service.
3. Every repository list method should result in a fixed number of SQL queries (O(1)), regardless of the number of items fetched.

## Verification Checklist
- [ ] If fetching 100 orders, does it run 2 queries (1 for orders + 1 for items) instead of 101 queries?
- [ ] Are cursor pagination boundaries applied to the parent query before child preloading?
- [ ] Are projections restricted to `<MODULE>_COLUMNS` rather than `SELECT *`?
