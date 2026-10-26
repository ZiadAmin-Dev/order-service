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

## Overview (6 project skills + 2 built-in)

| ID | Purpose (one line) |
| --- | --- |
| api-contract-review | Audit endpoint implementations against `docs/api-contracts.md` + `endpoint-config/*.json`: methods, status codes, auth, DTO schemas |
| database-review | Audit Knex migrations, tables, constraints, indexes, **sharding keys**, transaction boundaries, query patterns |
| dependency-injection-review | Audit the TSyringe DI flow end-to-end: tokens, container registrations, injections, startup |
| prevent-n-plus-one | Verify repositories/services don't loop per-row queries for related entities (orders + items) |
| response-dto-validation | Enforce Response DTOs on every controller — no entities, Knex rows, internal IDs, or secrets in HTTP responses |
| testing-and-debugging | Standardized test→debug→fix→re-verify cycle with architecture-aware root-cause |
| opencode (built-in) | Questions about OpenCode itself |
| report (built-in) | Report opencode issues to GitHub |

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

1. **Smaller skill library than core-service** (6 vs 37). Missing areas that are matched there but
   absent here: caching, pagination, retries/timeouts, idempotency, auth/security review,
   TypeScript conventions. This is an observation, not an installed change — extending the library
   here was out of the audit's approved scope. See `skills-research-report.md` §5.
2. `docs/` contains no dedicated `api contracts/<module>.md` split; a single `api-contracts.md`
   plus `endpoint-config/*.json` is the existing convention — `api-contract-review` correctly
   targets that. Do not import core-service's doc layout.
