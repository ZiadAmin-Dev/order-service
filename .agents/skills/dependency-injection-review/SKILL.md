---
name: dependency-injection-review
description: >-
  Audits the end-to-end Dependency Injection flow in TSyringe: tokens, container registrations,
  constructor injections, controller resolution, and application startup verification.
---

# Dependency Injection Review Workflow

## When it applies
Applies whenever adding or modifying services, controllers, infrastructure providers, or wiring routers.

## DI Invariants & Verification Checklist
1. **Token Defined**: Is there a corresponding symbol in `src/lib/di/tokens.ts` under `TOKENS`?
2. **Class Decorated**: Is the target class decorated with `@injectable()`?
3. **Dependencies Injected**: Are constructor arguments annotated with `@inject(TOKENS.<Dependency>)`?
4. **Registered in Container**: Is the dependency registered in `src/lib/di/container.ts` using `registerSingleton` or `registerInstance`?
5. **Resolution Safe**: Does router or startup resolution `container.resolve(TOKENS.<Controller>)` execute cleanly without circular dependency or missing token runtime crashes?
6. **No Ad-Hoc Instantiation**: Are controllers and services resolved via container rather than instantiated via `new` in routes or business handlers?
