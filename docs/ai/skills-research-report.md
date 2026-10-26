# Skills Research Report — order-service (2026-10-27)

Audit performed in one session against OpenCode **v2.0.29**. This report mirrors the deeper audit
done for core-service (`../core-service/docs/ai/skills-research-report.md`) where the two repos
share context.

## 1. Baseline (verified facts)

- **6 project-local skills on disk** under `.opencode/skills/`, each with valid YAML frontmatter
  (`name`, `description`) and audit-oriented instructions:
  `api-contract-review`, `database-review`, `dependency-injection-review`, `prevent-n-plus-one`,
  `response-dto-validation`, `testing-and-debugging`.
- OpenCode v2.0.29 documents `.opencode/skills/<id>/SKILL.md` as an official discovery location
  (https://opencode.ai/docs/skills/), so these are expected to be discoverable. Per-file live
  invocation was **not** exercised in this repo during the audit (read-only session) — statuses
  recorded as `discovered`, not `verified`.
- At audit time the skills lived under `.agents/skills/` (gitignored). On 2026-10-27 they were
  migrated to `.opencode/skills/` (OpenCode-native path); `.agents/` was removed and `.opencode/`
  was added to `.gitignore` (untracked, matching core-service's convention).
- **No global skills** (`~/.config/opencode/opencode.jsonc` contains only `$schema`).
- **2 built-in OpenCode skills** (`opencode`, `report`) are available off-disk.
- Repo instruction system: `AGENTS.md` (8 invariant sections incl. read-only core-service boundary,
  region sharding §6, monetary minor units §5, idempotency §8) is active as system instructions.
- `git status` at audit time was clean (no uncommitted changes) — audit adds only `docs/ai/`.

## 2. Research performed

Same sources and method as the core-service audit: official OpenCode skills docs, ecosystem
roundups (Firecrawl, Composio, opencode.school), outbox/messaging-specific searches, and the
anthropics/skills catalog. Conclusion carried over: the external ecosystem is dominated by
generic/frontend/other-stack skills and offers nothing that beats either the existing audit skills
or well-structured project-specific local skills.

## 3. Gap analysis (evidence-based)

Compared against the categories audited in core-service and this repo's invariants:

- **Well covered**: contract conformance, DTO hygiene, DI, database/sharding review, N+1,
  test-debug cycle — these map 1:1 to the highest-risk areas of this service (payments, payouts,
  multi-region sharding).
- **Gaps identified (documented, not installed)**:
  a. **Consumer-side event handling** — this service ingests `core.events` with
     `core-events:dedupe:{event_id}` dedupe, but no skill covers idempotent consumers, DLQ, or
     poison-message handling. Guidance exists only in `docs/core-service-integration.md` + AGENTS.md §8.
  b. **Caching** — core-service has a 4-skill caching block; here nothing (Redis cache layer exists).
  c. **Retries/timeouts for external calls** — Kashier gateway + core internal API calls exposed §8
     risks without a procedural skill.
  d. **Security review** (input validation, authz) — no dedicated skill, unlike core-service.
- Deliberately **not installed in this session**: the user requested documentation creation only;
  extending the skill library in order-service would deserve the same inspect-verify-grade process
  used in core-service (define gap → write against verified code → test discovery). Recorded as an
  open item instead.

## 4. Decisions

| Candidate | Decision | Evidence |
| --- | --- | --- |
| Create `docs/ai/` doc set (catalog, inventory JSON, workflows, this report) | **Do** | User request; zero code impact; solves discoverability |
| Port core-service's `event-outbox-publishing` skill to this repo | **Reject** | It documents the publisher side; here it would teach editing `EVENT_TYPES` in a repo where core-service is READ-ONLY (AGENTS.md §1). A future consumer-side skill (`messaging-consumer` / idempotent ingestion) is the correct counterpart |
| Copy core-service's catalog files verbatim | **Reject** | Different skill set, different doc conventions (`api-contracts.md` vs split contracts), different architecture (consumer + sharding vs publisher). Series was rewritten fresh from this repo's verified facts; any shared fact is linked, not duplicated |
| Install any external/Anthropic skills | **Reject** | Same reasons as core-service audit (stack mismatch, overlap, provenance) |

## 5. Open items / manual actions

1. Optional next improvement: author a consumer-side **event ingestion** skill for this repo
   (idempotent consumption, dedupe, DLQ handling) mirroring `event-outbox-publishing`'s rigor.
2. Optional: caching / retries / security skills to match core-service coverage parity.
3. `docs/ai/skills-inventory.json` was written as structured JSON and parsed at creation
   (verified: `ConvertFrom-Json` equivalent validation not re-run here — flagged for review).
4. One canonical home for skills now exists (`.opencode/skills/` after the migration). If any
   future directory (e.g. re-adding `.agents/`) is used alongside it, remember OpenCode loads
   **both** paths — avoid ID collisions.

## 6. What changed in this repo

- Added only: `docs/ai/skills-catalog.md`, `docs/ai/skills-inventory.json`,
  `docs/ai/skill-workflows.md`, `docs/ai/skills-research-report.md` (this file).
- Post-audit migration (user-requested): skills moved `.agents/skills/` → `.opencode/skills/`;
  `.agents/` deleted; `.opencode/` added to `.gitignore` (skills remain untracked). An empty
  unreferenced `.opencode/skills/quick-bite-review/` leftover folder was found during migration and
  deleted. No source code, migrations, AGENTS.md, or existing docs were modified.
