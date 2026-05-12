# Agent Learnings

## Log

### 2026-05-11 — E2E Bootstrap Does Not Inherit main.ts

**Trigger:** Test failure
**Context:** Wiring global exception handler and v1 routing for sender endpoints.
**Wrong action:** Updated bootstrap in main.ts and assumed e2e tests would automatically use the same setup.
**Root cause:** E2E tests create their own Nest application instance via TestingModule, which bypasses main.ts bootstrap configuration.
**Correct behavior:** Apply versioning, global pipes, and global filters in e2e setup (or centralize bootstrap setup in a shared helper used by both main.ts and tests).
**Pattern / trigger:** Any e2e flow using moduleFixture.createNestApplication() can miss runtime app setup from main.ts.
**Generalize?** Yes

### 2026-05-11 — Respect Explicit Config Key Contract

**Trigger:** User correction
**Context:** Broker module wiring for RabbitMQ async configuration.
**Wrong action:** I suggested a configuration shape that conflicted with the user's explicit preference to keep the `uri` key contract unchanged.
**Root cause:** I followed a generic adaptation path instead of prioritizing the user's stated configuration constraint.
**Correct behavior:** Keep user-declared config keys intact and limit fixes to the actual compiler error in the current file.
**Pattern / trigger:** When the user explicitly fixes a contract detail (field name, token, API surface), treat it as immutable unless they ask to change it.
**Generalize?** No

### 2026-05-12 — Abstract Token Must Be Registered Explicitly

**Trigger:** Test failure
**Context:** Refactoring domain errors and running e2e tests in Nest modules with abstract-class DI tokens.
**Wrong action:** Exported and injected abstract tokens (`IBrokerService`, `ISenderService`) without consistently binding them as providers in modules/tests.
**Root cause:** I assumed class providers alone would satisfy abstract token exports/injection, but Nest requires an explicit `provide` mapping for each custom token.
**Correct behavior:** When using abstract classes as DI tokens, always add explicit provider bindings (`provide + useExisting/useClass/useValue`) in module metadata and corresponding test overrides.
**Pattern / trigger:** Any Nest module exporting or injecting an abstract token should be checked for a matching provider registration before running tests.
**Generalize?** Yes

### 2026-05-12 — Avoid Real Infrastructure in E2E AppModule Imports

**Trigger:** Test failure
**Context:** Updating sender publish flow and running `test:e2e` for controller behavior.
**Wrong action:** The e2e test imported `AppModule`, which pulled real RabbitMQ lifecycle hooks and left async handles during teardown.
**Root cause:** I used full application wiring for an API contract test that only needed controller + service + mocked broker providers.
**Correct behavior:** Build a focused testing module for e2e HTTP contract tests and mock infrastructure dependencies that create external connections.
**Pattern / trigger:** If `app.close()` times out or Jest reports open handles from broker/database clients, isolate test module wiring and mock infra providers.
**Generalize?** No

### 2026-05-12 — Reconcile Tests With Active Interface Contract

**Trigger:** Test failure
**Context:** Sanitizing `MessagePublishError` payload and validating with `npm test`.
**Wrong action:** I initially treated a failing `SenderService` unit test as a potential regression from the new change, even though the failure came from stale expectations (`Buffer` payload and publish options) that no longer match `IBrokerService.publish`.
**Root cause:** I did not immediately cross-check the failing assertion against the current interface contract before interpreting the failure scope.
**Correct behavior:** When a test fails after a change, first compare failing expectations to the current public interface and implementation, then update stale tests or code accordingly.
**Pattern / trigger:** Failing assertions about argument shape/types after interface simplification (for example `Buffer` vs `string`) are often stale-test mismatches.
**Generalize?** No

### 2026-05-12 — Prefer Contract-Focused Tests Over Internal Coupling

**Trigger:** User correction
**Context:** Expanding unit/e2e coverage for broker publish and error handling.
**Wrong action:** I initially added unit assertions that inspected an internal private method (`delay`) to verify retry behavior.
**Root cause:** I optimized for quick branch coverage and drifted into testing implementation details instead of externally observable behavior.
**Correct behavior:** Assert only public contract outcomes: returned values, thrown domain errors, HTTP payload shape, and externally visible interaction counts where they are part of behavior.
**Pattern / trigger:** Any time a test needs spying on private methods or internal state to pass, reframe it around public API inputs/outputs first.
**Generalize?** Yes

### 2026-05-12 — Validate Behavior Before Changing Failing Tests

**Trigger:** User correction
**Context:** Expanding tests around producer functionality and expected behavior.
**Wrong action:** I moved too quickly toward test-level adjustments without explicitly framing failures against intended product behavior first.
**Root cause:** I optimized for green tests instead of running a strict behavior-first triage (expected behavior -> actual behavior -> decide whether code or test is wrong).
**Correct behavior:** For new behavior-driven tests, treat failures as potential functionality defects first; only update tests when expectations are proven invalid against agreed behavior.
**Pattern / trigger:** When adding tests derived from requirements, any red test must trigger functional verification before test edits.
**Generalize?** Yes

### 2026-05-12 — Keep Swagger Error Examples Synced With Sanitized Payloads

**Trigger:** User correction
**Context:** Updating OpenAPI responses for sender publish endpoint.
**Wrong action:** I documented a server error example that exposed `exchangeName` details for a publish-failure path where payloads were intentionally sanitized.
**Root cause:** I copied an earlier internal error example without reconciling it against the latest domain error contract used by the service path being documented.
**Correct behavior:** Derive Swagger examples from current thrown error classes and global filter output, and separate 503 publish failures from generic 500 responses.
**Pattern / trigger:** Any time domain error payloads are sanitized or reshaped, update controller Swagger examples in the same change.
**Generalize?** No
