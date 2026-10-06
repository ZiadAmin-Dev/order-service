---
name: testing-and-debugging
description: >-
  Standardized test-debug-fix cycle: run tests, observe failures, identify root causes
  by checking architecture and design requirements, implement fixes, and re-verify.
---

# Testing and Debugging Engineering Workflow

## When it applies
Applies during every implementation step, bug fix, refactor, and verification phase.

## Workflow Steps
1. **Run Tests**: Execute `npm run build` and `npm test` (`tsx --test test/**/*.test.ts`).
2. **Observe Failures**: Carefully read error messages, stack traces, assertion differences, and exit codes.
3. **Investigate Root Cause**:
   - Do NOT just apply a superficial patch to silence the immediate error.
   - Inspect the intended domain design, database schema, or `core-service` reference pattern.
   - Trace the exact data flow: Request -> Validation -> Controller -> Service -> Repository -> Database/Cache.
4. **Correct Implementation**: Make targeted architectural fixes that resolve the root cause.
5. **Retest & Verify**: Rerun the test suite to confirm the fix works and does not introduce regressions.
6. **Negative & Edge Path Verification**:
   - Test invalid inputs, unauthorized roles, missing records, race conditions, and external service failures.
