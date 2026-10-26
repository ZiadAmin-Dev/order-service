# Skills Catalog — Quick Bite order-service

Generated 2026-10-27 against OpenCode **v2.0.29**. Machine-readable twin:
`docs/ai/skills-inventory.json`. Task routing: `docs/ai/skill-workflows.md`.

## Structure

OpenCode discovers skills from `.opencode/skills/<id>/SKILL.md` (native path). The 6 skills were
migrated from `.opencode/skills/` on 2026-10-27; the `.agents/` directory was removed and `.opencode/`
is gitignored (untracked local library, matching the core-service convention). All 6 skills carry
valid YAML frontmatter (`name` + `description`). Two built-in skills (`opencode`, `report`) ship
with OpenCode and are not on disk in this repo.

No global skills are configured: `~/.config/opencode/opencode.jsonc` contains only `$schema`.

## Overview (26 project skills + 2 built-in)

Skills 1–6 are the original audit library. Skills 7–25 were ported from core-service's library on
2026-10-27 (instructions adapted to this repo: sharding, consumer-side events, order-domain
examples; core-specific claims marked Undetermined). Skill 26 (`event-inbox-consumer`) was written
fresh as the consumer-side counterpart of core-service's `event-outbox-publishing`.

| # | ID | Purpose (one line) |
| --- | --- | --- |
| 1 | api-contract-review | Audit endpoint implementations against `docs/api-contracts.md` + `endpoint-config/*.json`: methods, status codes, auth, DTO schemas |
| 2 | database-review | Audit Knex migrations, tables, constraints, indexes, **sharding keys**, transaction boundaries, query patterns |
| 3 | dependency-injection-review | Audit the TSyringe DI flow end-to-end: tokens, container registrations, injections, startup |
| 4 | prevent-n-plus-one | Verify repositories/services don't loop per-row queries for related entities (orders + items) |
| 5 | response-dto-validation | Enforce Response DTOs on every controller — no entities, Knex rows, internal IDs, or secrets in HTTP responses |
| 6 | testing-and-debugging | Standardized test→debug→fix→re-verify cycle with architecture-aware root-cause |
| 7 | repository-exploration | Orient in unfamiliar code: find files, map call chains and shard targets before edits |
| 8 | safe-code-changes | Minimal-diff edits that fix the task without breaking neighbors or contracts |
| 9 | problem-solving | Systematic bug diagnosis; root causes over symptoms, layer-by-layer checklist |
| 10 | code-review | 8-point repo checklist review of any diff (read-only) |
| 11 | documentation | Docs that stay true to code; matches this repo's `docs/` conventions |
| 12 | separation-of-concerns | Right layer per piece (pkg/lib/app), region-shard discipline |
| 13 | naming-conventions | Names matching repo conventions (DTO/entity/token/tables) |
| 14 | error-handling | Typed AppErrors through central middleware |
| 15 | typescript-best-practices | strict + decorator TS preventing bugs |
| 16 | express-api-design | Endpoints matching routing/middleware/status conventions; internal-API-key guard rules |
| 17 | request-validation | Reject bad input at the boundary via class-validator DTOs |
| 18 | input-security | OWASP handling of untrusted input; no secret leakage; internal key auth |
| 19 | logging-and-observability | Correlated logs, DLQ-aware consumer visibility |
| 20 | pagination | Cursor/limit list pages with composite-index discipline |
| 21 | sql-and-postgresql | Correct Knex SQL per region shard; safe migrations applied to every shard |
| 22 | transactions-and-acid | Service-level transactions on `db(region)`, optimistic precedents |
| 23 | idempotency | Idempotency-Key discipline for orders/payments/webhooks |
| 24 | concurrency-and-race-conditions | Optimistic transitions, race-window naming, no cross-shard cracks |
| 25 | retries-and-timeouts | Timeouts/retry budgets for Kashier + core-client + broker calls |
| 26 | event-inbox-consumer | **New.** core.events consumer: envelope validation → Redis dedupe → transactional idempotent handlers → ack/nack → DLQ (consumer counterpart of core-service's `event-outbox-publishing`) |
| — | opencode (built-in) | Questions about OpenCode itself |
| — | report (built-in) | Report opencode issues to GitHub |

## Availability status legend

- **discovered** — file on disk, frontmatter valid. Per-file live-invocation testing was not
  performed for this repo in the audit session (OpenCode v2.0.29 loads `.opencode/skills/*` per
  https://opencode.ai/docs/skills/).
- **unverified** — behavior accepted as documented (the two built-ins).

All 6 project skills: **discovered**. Statuses are also recorded in `skills-inventory.json`.

## Cross-repo relationships (core-service ↔ order-service)

- Core-service (publisher) and this service (consumer) share the `core.events` contract. The
  publisher-side procedure skill lives in core-service: `.opencode/skills/event-outbox-publishing/`.
  Consumer-side guidance (idempotent ingestion, dedupe by `core-events:dedupe:{event_id}`, cache
  invalidation from events) is documented in:
  - `docs/system-design/` (this repo)
  - `docs/core-service-integration.md` — the shared contract source of truth
- When auditing event handling here, treat `event-types.ts` routing keys in core-service as the
  contract; never edit them from this repo (AGENTS.md §1: `core-service/` is read-only).

## Known limitations (found during the audit)

1. **No caching block**: core-service has a 4-skill caching set; order-service's Redis usage is
   currently a `pkg` provider only — a caching skill was not ported (scope decision; revisit when
   order-side caching becomes a design element).
2. No skills for TDD workflows or architecture decision records — deferred, not needed yet.
3. Ported skills adapted for this repo; every core-specific example was rewritten or marked
   **Undetermined** where this repo's implementation state is unverified (e.g. idempotency
   middleware, cursor pagination helpers, consumer code). Trust flags still require code checks.
4. `docs/` contains no dedicated `api contracts/<module>.md` split; a single `api-contracts.md`
   plus `endpoint-config/*.json` is the existing convention — `api-contract-review` correctly
   targets that. Do not import core-service's doc layout.
