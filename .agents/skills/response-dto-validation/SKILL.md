---
name: response-dto-validation
description: >-
  Enforces wire contracts and Response DTO usage across all controllers to guarantee
  no database entities, Knex row objects, internal IDs, or secrets leak into HTTP responses.
---

# Response DTO Review & Wire Contract Enforcement

## When it applies
Applies to every controller action in `order-service`.

## Constraints & Requirements
1. Controllers must NEVER return database entities, Knex row records, or raw external gateway responses directly.
2. Every response payload MUST be transformed using an explicit Response DTO class with a `static from(...)` factory.
3. Monetary amounts MUST be represented as integer minor units alongside the explicit `currency` string.
4. Timestamps MUST be serialized as ISO 8601 strings (`Date.toISOString()`).
5. Internal DB fields (e.g. database serial PKs where a public UUID exists, internal hash fields, secrets) must NEVER leak into the response DTO.

## Verification Checklist
- [ ] Is the controller calling `sendSuccess(res, DTO.from(entity))`?
- [ ] Is `sendPaginated` receiving an array of mapped DTOs?
- [ ] Does the response match the declared contract in `endpoint-config/`?
