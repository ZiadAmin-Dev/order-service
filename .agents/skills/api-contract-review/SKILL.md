---
name: api-contract-review
description: >-
  Audits endpoint implementations against API specifications in docs/api-contracts.md
  and endpoint-config/*.json, ensuring HTTP methods, status codes, auth, and DTO schemas match.
---

# API Contract Review Workflow

## When it applies
Applies whenever inspecting, modifying, or creating routes, controllers, or DTOs.

## Verification Checklist
1. **Endpoint Config Alignment**: Check `endpoint-config/<module>.json`:
   - Does HTTP method and path match the route definition?
   - Does authentication middleware match the `auth` requirement?
   - Does RBAC permission match the specified `<resource>:<action>`?
   - Does the request DTO match the `requestDTO` specified?
   - Does the response DTO and HTTP status code match `responseDTO` and `successCode`?
2. **DTO Validation**:
   - Is request body validated using `validateBody(DTO, req.body)`?
   - Are class-validator decorators complete with appropriate types and constraints?
3. **Response Envelope**:
   - Success responses wrapped in `{ success: true, data: ... }` via `sendSuccess`.
   - Paginated responses wrapped in `{ success: true, data: [...], meta: { cursor, hasMore } }` via `sendPaginated`.
   - Error responses wrapped in `{ success: false, error: message }` via `errorHandler`.
