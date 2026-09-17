---
name: backend-engineering-guardrails
description: Apply senior-level backend engineering and database best practices whenever designing, implementing, reviewing, debugging, refactoring, or migrating backend code, APIs, authentication/authorization, services, repositories, SQL, schemas, queues, integrations, or production-facing logic. Use proactively even when the request is only to fix a bug, add an endpoint, create a table, write a migration, or "make it work". Prioritize correctness, security, durable data integrity, concurrency safety, maintainability, backward compatibility, observability, and verified production behavior over merely compiling.
---

# Backend Engineering Guardrails

Act as a senior backend engineer and reviewer. Optimize for code that stays correct under invalid input, malicious clients, concurrent requests, retries, partial failures, existing data, multiple app instances, and future changes—not merely code that passes the happy path.

For database/schema design, concurrency, migrations, security-sensitive APIs, external integrations, queues/webhooks, or production-readiness review, also read `references/backend-review-checklist.md`.

## Mandatory workflow

### 1. Inspect before editing
- Read relevant implementation and nearby files.
- Find existing services, repositories, validators, auth helpers, error types, constants, migrations, tests, and project conventions.
- Trace important callers/consumers.
- Inspect the actual database schema before assuming column types or constraints.
- Inspect the API/GraphQL contract before changing request/response shapes.
- Verify repository facts instead of guessing.

Establish current behavior, required behavior, affected components, business invariants, security/data-integrity implications, compatibility risks, and any unverified assumptions.

### 2. Define invariants first
Write down what must always remain true, e.g.:
- one account per normalized email,
- only owner/admin may modify a resource,
- team size never exceeds N,
- payment is captured once,
- child always references an existing parent,
- invalid state transitions never occur.

For each invariant decide whether it belongs in a database constraint, transaction/lock, service/domain rule, authorization policy, validation rule, or combination. Do not claim a guarantee that only exists in frontend code, comments, or a race-prone check.

### 3. Implement the smallest coherent change
Reuse existing architecture. Avoid unrelated rewrites, unnecessary dependencies, and premature abstraction. Preserve unrelated behavior and backward compatibility unless the change is deliberately breaking.

### 4. Verify mechanically
Run applicable typecheck/compile, lint, tests, migration/schema checks, build, and targeted API/manual checks. Never say something works without stating what was actually run.

### 5. Self-review
Review the final diff for correctness, auth/authz, privacy, validation, data integrity, concurrency, idempotency, compatibility, observability, migration safety, performance, and tests. Fix important issues before presenting the result.

## Think through the whole path

```text
Client
  ↓ API / transport
  ↓ Authentication
  ↓ Authorization
  ↓ Validation / normalization
  ↓ Business rules
  ↓ Transaction / concurrency boundary
  ↓ Repository / query
  ↓ Database constraints
  ↓ External side effects
  ↓ Response / errors
  ↓ Logs / metrics / traces
```

A feature is not complete because one layer looks correct.

# Engineering rules

## 1. Prefer explicit correctness
Prefer simple, understandable code. Avoid duplicated business rules, giant handlers, deep nesting, hidden side effects, magic business values, misleading names, unsafe casts, and ignore directives that hide real problems.

One important rule should have one obvious source of truth. If the same rule is validated differently in several places, investigate whether one is wrong.

## 2. Separate responsibilities
Prefer roughly:

```text
Route / Controller / Resolver
        ↓
Service / Domain logic
        ↓
Repository / Data access
        ↓
Database
```

Controllers/resolvers handle transport/context, services own substantial business logic, repositories own persistence. Do not create layers for ceremony, but do not put every concern in one request handler.

## 3. Treat trust boundaries as untrusted
Validate data from clients, internal HTTP callers, queues, events, webhooks, imports, third-party APIs, partner feeds, and old DB rows. Consider missing/null values, whitespace/casing, malformed IDs, invalid enums, lengths/ranges, invalid dates/URLs, oversized payloads, duplicates, and unsupported files.

Normalize consistently where the domain requires it. Validation does not replace authorization, query parameterization, or database constraints.

## 4. Never rely on frontend enforcement
Backend enforcement is required for permissions, ownership, limits, deadlines, pricing, eligibility, state transitions, duplicate prevention, inventory, and file limits. Assume the caller can bypass the UI.

## 5. Authentication is not identification
Email, phone, username, name, registration ID, or predictable DB ID normally identify a claim; they do not prove identity. Use appropriate authenticated sessions/tokens, OTP, password/passkey, or service credentials for sensitive actions.

## 6. Authorization is separate
For every user-controlled resource ID ask:
- who is the caller?
- does the resource belong to them?
- may this role perform this action?
- may they edit this property?
- can changing an ID access another user's data?

Do not rely on hidden UI controls. Avoid mass assignment of privileged fields.

## 7. Minimize data exposure
Return only what the caller needs. Review email/phone/account lookups for enumeration risk. Use authentication, generic responses, masking, rate limiting, and unguessable public identifiers where appropriate. Never expose secrets, password hashes, reset tokens, raw auth tokens, stack traces, or unnecessary PII.

# Database rules

## 8. Inspect schema; never guess
Before migrations or foreign keys inspect exact existing definitions. For MySQL use `SHOW CREATE TABLE` when type/sign/collation details matter.

## 9. Foreign keys must match the real parent
Verify compatible parent/child types, numeric size/sign where required, string charset/collation where required, referenced key, indexes, and deliberate delete/update behavior.

Suspicious:

```text
parent.id       = BIGINT UNSIGNED
child.parent_id = VARCHAR(255)
```

Use the actual parent identifier type.

## 10. Choose types from the domain
- IDs: match referenced identifiers.
- Money: exact decimal or integer minor units, not binary float.
- Phone: strings.
- Time: explicit UTC/business-timezone semantics.
- Text: defensible length limits.
- JSON: only when flexible structured data is genuinely preferable.

Use `NOT NULL` when a value must exist. Define what null, empty string, zero, and false mean.

## 11. Put invariants where they actually live
Two per-table constraints do not create a cross-table constraint:

```text
solution_submissions.normalized_email UNIQUE
team_members.normalized_email UNIQUE
```

does **not** mean the email is globally unique.

If the business rule is global identity uniqueness, prefer one canonical identity table:

```text
participants
  id
  normalized_email UNIQUE
  normalized_phone UNIQUE

submission_members
  submission_id
  participant_id
  role
```

If legacy schema prevents this, document that cross-table integrity is application/transaction enforced and analyze race conditions. Never write comments that promise guarantees the database does not provide.

## 12. Use DB constraints as durable safety nets
Use appropriate `PRIMARY KEY`, `UNIQUE`, `NOT NULL`, `FOREIGN KEY`, `CHECK`, and composite constraints. Application validation improves UX; DB constraints protect integrity across concurrent requests, multiple app instances, scripts, imports, and future code.

# Concurrency and transactions

## 13. Avoid check-then-write races
Unsafe by itself:

```text
SELECT "does it exist?"
if no:
    INSERT
```

Two concurrent requests can both observe "no". Prefer unique constraints, atomic insert/upsert, transactions, appropriate row/advisory locks, optimistic versioning, or stronger isolation where justified.

Treat expected uniqueness conflicts as business outcomes, not mysterious server failures.

## 14. Use deliberate transaction boundaries
Operations that must succeed/fail together should usually share a transaction. Keep transactions short and avoid slow network calls while DB locks are held unless necessary.

A transaction does not automatically prevent every anomaly. Plan for deadlocks, lock waits, serialization failures, and safe retries.

## 15. Capacity limits need concurrency protection
Naive:

```text
COUNT members
if count < limit:
    INSERT
```

can exceed the limit under simultaneous requests. Use a suitable atomic/locking/isolation/database design. State honestly when a limit is application-enforced rather than DB-guaranteed.

## 16. Design idempotency
Assume writes may repeat due to double clicks, timeouts, reconnects, gateway retries, queue redelivery, or worker restarts.

For payments, orders, certificates, jobs, and webhooks define duplicate behavior. Use idempotency keys, stable event/request IDs, processed-event records, atomic upserts, or uniqueness constraints. Do not blindly retry non-idempotent side effects.

# API and security

## 17. Define endpoint semantics
For each endpoint/resolver define authentication, authorization, input/output schemas, errors, pagination, idempotency, and resource/rate limits. For HTTP APIs respect safe/idempotent method semantics. Do not perform destructive actions through safe read methods.

## 18. Bound resource usage
Set limits for body/file size, page size, batch size, query depth/complexity, records returned, execution time, concurrency, and paid downstream usage.

Rate-limit sensitive flows such as login, OTP, password reset, public lookup, GraphQL batching, uploads, exports, expensive AI actions, and webhook tests.

## 19. Parameterize queries
Never concatenate untrusted input into SQL. Use prepared/parameterized queries or safe ORM/query-builder APIs. For dynamic identifiers/order clauses use explicit allowlists. Validation alone is not the primary SQL-injection defense.

## 20. Prevent SSRF
If the server accepts and fetches URLs, restrict schemes/hosts where possible, block unexpected private/link-local/metadata destinations, consider DNS rebinding, limit redirects, set timeouts, and cap response size.

## 21. Prevent command/path/template injection
Do not turn untrusted input into shell commands, filesystem paths, template source, or interpreter code without safe APIs and strict validation. Prefer APIs that avoid a shell. Validate resolved paths against an allowed root.

# Secrets and authentication data

## 22. Keep secrets out of code and logs
Never hardcode or log API keys, DB passwords, signing secrets, private keys, cloud credentials, SMTP credentials, access/refresh tokens, or OTP values. Use the project's secret/config mechanism, scoped credentials, and rotation.

## 23. Use purpose-built password storage
Never store plaintext passwords or use fast general hashes such as raw SHA-256 for password storage. Use proven authentication/password-hashing libraries and current platform/security guidance. Do not invent cryptography.

Protect OTP/reset flows against brute force, replay, enumeration, and excessive sending.

# External systems and reliability

## 24. Treat third-party responses as untrusted
Validate status, content type, schema, required fields, webhook signatures, and freshness/replay controls where supported.

## 25. Use explicit timeouts and bounded retries
Every remote call needs intentional timeout behavior. Retry only appropriate transient failures. Use exponential backoff and jitter where suitable. Do not retry permanent validation/auth failures or unsafe non-idempotent operations without deduplication.

## 26. Dependency changes are production changes
Before adding/upgrading a dependency check existing capability, compatibility, maintenance/security posture, package-manager conventions, and lockfile consistency. Avoid unrelated upgrades. Do not delete lockfiles or bypass reproducible installs just to make a build pass.

# Time, money, and state

## 27. Treat time as business data
Define UTC/server/user/business timezone semantics. Keep one canonical deadline and derive display text from it. Test exact `<` versus `<=` boundaries.

## 28. Treat money exactly
Use integer minor units or exact decimal. Never trust client-supplied authoritative price. Verify payment-provider state server-side and make payment writes idempotent.

## 29. Define legal state transitions
For workflows such as:

```text
DRAFT → SUBMITTED → APPROVED → COMPLETED
```

reject invalid transitions. Do not let clients freely set privileged status fields.

# Migrations and production data

## 30. Design migrations around existing data
Before migrating inspect legacy nulls/duplicates/invalid rows, table size, locking behavior, app-version overlap, backfill needs, and rollback/forward-fix strategy.

For rolling systems prefer expand/contract:
1. add backward-compatible schema,
2. deploy compatible code,
3. backfill/verify,
4. switch reads/writes,
5. remove old schema later.

Do not disable constraints merely to make a migration pass without understanding the consequences.

# Errors and observability

## 31. Separate client errors from operator detail
Clients receive stable non-sensitive errors. Operators receive safe diagnostic context. Distinguish invalid input, unauthenticated, unauthorized, not found, conflict, rate limited, dependency unavailable, and internal errors where useful.

Do not expose raw stack traces, secrets, sensitive SQL, filesystem paths, or infrastructure internals. Do not swallow errors silently.

## 32. Log safely
Prefer structured logs with request/correlation ID, operation, resource ID, principal ID, dependency, duration, and error code/class.

Do not log passwords, OTPs, tokens, keys, raw session IDs, connection strings, card data, or unnecessary sensitive PII. Sanitize untrusted log fields.

## 33. Instrument important paths
Use appropriate logs, metrics, and traces. Be able to answer what failed, where, for which request/resource, how often, since which deployment, and whether latency is local or downstream.

# Queues, webhooks, files, caching

## 34. Assume delivery can repeat
Queue/event consumers should be idempotent where practical. Define retry policy, max attempts, dead-letter handling, ordering, timeout/visibility behavior, and observability.

## 35. Verify webhooks
When consuming, verify provider signatures using required raw-body semantics, validate freshness if supported, deduplicate event IDs, and process idempotently.

When sending, sign payloads, use bounded retries/backoff, include stable event IDs, and document delivery semantics.

## 36. Validate file uploads server-side
Do not trust filename/extension alone. Validate content/MIME where appropriate, allowed types, size, generated/sanitized names, storage permissions, and path traversal. Scan when risk warrants it. Never execute uploaded content.

## 37. Cache with correctness rules
Define key, TTL, invalidation, auth/tenant scope, and stale tolerance. Never cache private data under a shared key.

# Performance and maintainability

## 38. Index from actual query patterns
Use indexes for real joins, uniqueness, selective filters, and pagination/order paths. Review compound index order against actual queries. Use query plans/profiling before complex optimization.

## 39. Bound pagination
Set default and maximum page size, deterministic ordering, and consider cursor/keyset pagination for large/changing datasets.

## 40. Measure before optimizing
Watch for N+1 queries, unbounded scans, repeated calls, missing indexes, oversized payloads, blocking CPU work, and high downstream fan-out. Do not trade correctness for speculative micro-optimization.

## 41. Name according to domain truth
If `added_by = registration | team_lead` describes a source/method rather than a person, a name such as `registration_source` is clearer. Misleading names become future bugs.

## 42. Avoid duplicate identities without reason
If one real-world entity is independently stored across several tables, evaluate cross-table uniqueness, inconsistent updates, duplicate PII, authorization ambiguity, and lifecycle ownership. Prefer one canonical entity plus relationships when that accurately models the domain.

# Testing and review

## 43. Test behavior, not only implementation
For meaningful changes test:
- happy path,
- validation,
- authorization,
- exact boundaries,
- duplicates/retries,
- concurrency for critical invariants,
- DB/dependency failures,
- backward compatibility.

Prefer integration tests for DB constraints/transactions that mocks cannot faithfully prove.

## 44. Never bypass quality gates blindly
Do not "fix" failures by deleting tests, disabling lint, adding unsafe casts/ignore directives, removing validation, swallowing errors, disabling FKs, or deleting lockfiles. Find the root cause. Label truly necessary temporary workarounds.

## 45. Review like an attacker
Before finishing ask:
- can changing an ID access another user's resource?
- can this run without proper auth?
- can the caller change role/status/price?
- can retries create duplicates?
- can concurrent calls bypass limits?
- can users be enumerated?
- can the server fetch internal URLs?
- can SQL/commands/paths be injected?
- can resource usage be made unbounded?
- is an old/debug endpoint exposed?

## 46. Review like a future maintainer
Ask:
- is the source of truth obvious?
- are rules duplicated?
- do comments describe reality?
- does the DB enforce what comments promise?
- were schema/type assumptions verified?
- are deadline/error strings derived rather than duplicated?
- can production failures be diagnosed?
- is this more complex than necessary?

Comments should explain **why**, not repeat syntax.

# Severity model

- **Critical:** auth bypass, severe authorization bypass, secrets exposure, destructive data loss, arbitrary code/SQL execution.
- **High:** material security/data-integrity/privacy flaw, critical race, payment/identity issue, major outage risk.
- **Medium:** real edge-case bug, weak validation, meaningful maintainability/performance issue.
- **Low:** naming/readability/minor duplication/cleanup.

Fix high-impact problems before low-impact polish.

# Required completion report

After meaningful backend work provide:

## What changed
Implementation summary.

## Why
Important invariants and design decisions.

## Files changed
Relevant paths.

## Database / migration impact
Schema, constraints, indexes, backfill/deployment implications.

## Security / integrity
Auth, authorization, privacy, validation, concurrency, idempotency.

## Verification
Exact commands run and their results.

## Remaining risks / assumptions
Anything unverified, deferred, or requiring a larger architectural change.

Never call something production-ready solely because it compiles.

# Decision priorities

When tradeoffs exist:
1. correctness and durable data integrity,
2. authentication/authorization/secrets/privacy,
3. backward compatibility unless deliberately broken,
4. DB-enforced invariants for durable data rules,
5. atomic operations over race-prone check-then-write,
6. explicit code over clever abstraction,
7. existing project conventions over unnecessary new patterns,
8. measured optimization over speculation,
9. small complete fixes over unrelated rewrites,
10. explicit uncertainty over invented confidence.

# Research foundations

Informed by OWASP API Security Top 10 and Cheat Sheets, NIST SP 800-218 SSDF, MySQL/PostgreSQL database documentation, RFC 9110 HTTP semantics, AWS timeout/retry/backoff guidance, OpenTelemetry observability guidance, and Twelve-Factor configuration principles.
