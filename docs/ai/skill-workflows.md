# Skill Workflows — Quick Bite order-service

Which of the 6 available skills to use per task, in what order, and when to skip. The skill set
here is deliberately audit-oriented; for writing new code, follow `AGENTS.md` invariants directly.

Invocation: OpenCode v2.0.29 loads `.opencode/skills/<id>/SKILL.md` automatically when a task matches
its description; users may also invoke explicitly (`@api-contract-review`, etc.). Do not chain
multiple audits reflexively — each is a full read-through pass.

| # | Task | Primary skill | Supporting | Deliverable |
| --- | --- | --- | --- | --- |
| 1 | Add or change an endpoint | `api-contract-review` (after implementing) | `response-dto-validation` | Endpoint matching `docs/api-contracts.md` + `endpoint-config/*.json` |
| 2 | Audit responses end-to-end | `response-dto-validation` | `api-contract-review` (if contract mismatch suspected) | No entity/row/internal-ID/secret leaks; every controller has a Response DTO `.from()` |
| 3 | Write or review a migration | `database-review` | — | Sharding-key discipline (§6), constraints, indexes, reversible `down` |
| 4 | Diagnose slow listing endpoints | `prevent-n-plus-one` | `database-review` (if indexes missing) | Batched (`whereIn`) queries; per-row loop eliminated |
| 5 | New module wiring | `dependency-injection-review` | — | TOKENS registered, container startup verified |
| 6 | Test-debug-fix loop | `testing-and-debugging` | the skill matching the failing layer | Failing test → root cause via architecture → fix → green run evidence |
| 7 | Consume a core.events change | *(no dedicated skill — see gaps)* | `database-review` | Idempotent consumer deduping on `core-events:dedupe:{event_id}`; contract in `docs/core-service-integration.md` |
| 8 | Review money paths (orders, payouts, commissions) | `response-dto-validation` | `database-review` | Integer minor units everywhere (§5), currency string present |
| 9 | Webhook/idempotent payment flows | `testing-and-debugging` | `database-review` | Optimistic `WHERE status = :expected` updates; idempotency enforced (§8) |

## Ordering rules of thumb

- **Implementation first, then audit**: 1 is designed as a post-implementation pass in this repo.
- **Contract is the arbiter**: for any HTTP-related dispute, `docs/api-contracts.md` and
  `endpoint-config/*.json` win; the skills only check against them.
- **Sharding first**: any query touching orders/payments must state its region shard; if the
  primary skill says nothing about `db(region)`, before finishing, apply §6 manually.
- **Skip rules**: 4 skips `database-review` when the fix is evidently a loop→`whereIn` change; 8
  skips `response-dto-validation` when changes touch no controller code.

## Anti-patterns

- Editing or copying anything from `core-service/` (AGENTS.md §1: read-only, always).
- Introducing core-service's doc layout (`api contracts/<module>.md`) — the single
  `api-contracts.md` convention rules here.
- Cross-shard joins "just for a report" — run reports per shard and aggregate in code if needed.
- Assuming exactly-once event delivery — dedupe by `event_id`; at-least-once is the contract.
