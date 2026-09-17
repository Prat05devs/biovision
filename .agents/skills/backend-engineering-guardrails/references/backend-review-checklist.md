# Backend Review Checklist and Deep-Dive Notes

Load this reference when the task involves database/schema design, concurrency, transactions, security-sensitive APIs, migrations, external integrations, queues/webhooks, or production-readiness review.

## Database invariant review

For every table or migration ask:

1. What real-world entity does the table represent?
2. What is the canonical identity for that entity?
3. Which fields are authoritative and which are user-editable?
4. Which values must be globally unique?
5. Is the uniqueness rule actually global, or only per parent/tenant/submission?
6. Does the physical schema enforce the same scope as the business rule?
7. Are parent/child identifier types compatible?
8. Are foreign-key delete/update actions intentional?
9. Are nullable fields genuinely optional?
10. Could existing data violate the new constraint?
11. What happens under two simultaneous writes?
12. Can another service/script bypass an application-only rule?

### Cross-table uniqueness example

This:

```sql
CREATE TABLE leads (
  normalized_email VARCHAR(254) NOT NULL UNIQUE
);

CREATE TABLE teammates (
  normalized_email VARCHAR(254) NOT NULL UNIQUE
);
```

does not guarantee "one email across the whole system".

Both tables may legally contain the same value.

If one person is one global identity, prefer:

```sql
CREATE TABLE participants (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  normalized_email VARCHAR(254) NOT NULL UNIQUE,
  normalized_phone VARCHAR(15) NOT NULL UNIQUE
);
```

Then reference `participants.id` from role/relationship tables.

When legacy compatibility prevents redesign, application checks can reduce risk but do not automatically provide the same concurrency guarantee as one database constraint.

### Foreign-key review example

Before:

```sql
submission_id VARCHAR(255) NOT NULL,
FOREIGN KEY (submission_id) REFERENCES solution_submissions(id)
```

inspect:

```sql
SHOW CREATE TABLE solution_submissions;
```

If the parent is:

```sql
id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT
```

use the compatible child type:

```sql
submission_id BIGINT UNSIGNED NOT NULL
```

Do not infer the parent type from application naming.

### Comments must not overclaim

Bad schema comment:

```text
One person, one entry.
```

when the database only enforces uniqueness within one of several participant tables.

Better comment:

```text
Email/phone are unique among teammate rows.
Cross-table conflicts with legacy lead rows are currently enforced by the service layer.
```

Then open an architectural issue if global integrity is required.

## Concurrency review

Look for read-modify-write sequences:

```text
read current state
check rule
write new state
```

Examples:
- count then insert,
- check existence then create,
- read balance then update,
- check inventory then reserve,
- verify status then transition.

Ask what happens when two transactions execute the same sequence concurrently.

Possible controls:
- unique/check constraints,
- atomic conditional `UPDATE`,
- `INSERT ... ON CONFLICT` / upsert,
- row locks such as `SELECT ... FOR UPDATE`,
- advisory locks,
- optimistic version field,
- serializable isolation,
- queue/partition serialization.

Choose the simplest mechanism that actually protects the invariant.

### Team-size example

Potentially unsafe:

```text
SELECT COUNT(*) WHERE team_id = ?
if count < 4:
  INSERT member
```

Safer approaches depend on the DB/model:
- lock the team row inside the transaction, then count/insert;
- maintain an atomic constrained counter;
- redesign representation if the limit is fundamental.

Application traffic being "low" is not proof that a race cannot happen.

## Transaction review

Use one transaction when partial success would violate the domain.

Check:
- all DB operations use the same transaction/session,
- failures roll back,
- network calls are not unnecessarily inside DB locks,
- transaction duration is bounded,
- deadlocks/serialization failures are handled appropriately,
- retry logic does not duplicate external side effects.

## Idempotency review

For a write, ask:

```text
If this exact request is processed twice, what happens?
```

Common protections:
- unique business key,
- idempotency key,
- unique provider event ID,
- atomic upsert,
- processed-events table.

For webhook/queue processing, persist the event ID and business change atomically when feasible.

## API authorization review

For every object ID accepted from a caller:
- verify ownership/tenant scope,
- avoid query-by-ID followed by missing auth check,
- prevent writable privileged properties,
- separate admin and ordinary capabilities,
- test another user's ID.

Review GraphQL resolvers as carefully as REST routes.

## Enumeration review

Potentially sensitive response differences:
- registered vs unregistered email,
- valid vs invalid phone account,
- teammate vs team lead,
- password-reset account existence.

Decide whether the product genuinely needs the distinction publicly.

Mitigations:
- auth gate,
- generic response,
- masking,
- rate limits,
- audit/abuse monitoring.

## Input validation review

Validate syntax and domain semantics.

Examples:
- email syntax and max length,
- phone canonical format,
- enum membership,
- integer range,
- text max length,
- date bounds,
- URL scheme/host restrictions,
- file type and size.

Centralize repeated validators when it prevents divergence.

Do not force technically valid free-form human text into an unnecessarily restrictive regex.

## Error review

Map errors intentionally:

```text
BAD_USER_INPUT / 400
UNAUTHENTICATED / 401
FORBIDDEN / 403
NOT_FOUND / 404
CONFLICT / 409
GONE / 410
RATE_LIMITED / 429
INTERNAL / 500
DEPENDENCY_UNAVAILABLE / 502/503
```

Exact transport mapping depends on GraphQL/REST conventions.

Log the underlying internal error with safe context while returning a non-sensitive client error.

## Logging review

Good structured context:
- request ID,
- actor/principal ID,
- resource ID,
- operation,
- dependency,
- duration,
- error code.

Usually exclude:
- passwords,
- OTPs,
- tokens,
- keys,
- raw session IDs,
- DB credentials,
- full payment data,
- unnecessary PII.

## External-call review

For every HTTP/RPC dependency:
- connection/request timeout,
- bounded retry count,
- retryable status/error list,
- exponential backoff,
- jitter,
- idempotency safety,
- response size limit where needed,
- circuit/bulkhead behavior if architecture warrants it,
- metrics for latency/errors.

## SSRF review

For user-controlled URLs:
- scheme allowlist,
- hostname/domain allowlist where possible,
- private/link-local/loopback/metadata blocking,
- redirect policy,
- DNS rebinding considerations,
- timeout,
- max response size.

Do not assume URL parsing alone prevents SSRF.

## Migration review

Before migration:
- inspect existing duplicates/nulls,
- estimate affected rows,
- understand table-lock/DDL behavior,
- decide backfill,
- preserve compatibility with currently deployed code,
- rehearse on realistic data when risk is meaningful.

Prefer expand/contract for rolling deploys.

Do not combine an unrelated destructive cleanup with a feature migration.

## Time review

For deadlines:
- canonical timezone,
- exact inclusive/exclusive boundary,
- server clock source,
- one stored deadline value,
- display label derived from the value.

Test one instant before, exactly at, and one instant after the deadline.

## Performance review

Check:
- N+1 queries,
- unnecessary full scans,
- missing join/filter indexes,
- unbounded result sets,
- large JSON/blob loading,
- repeated queries in loops,
- synchronous CPU-heavy work,
- high downstream fan-out.

Use query plans/metrics before complex optimization.

## Dependency/reproducibility review

When install/build fails:
- identify project package manager,
- inspect lockfile consistency,
- do not casually mix npm/yarn/pnpm,
- do not delete the lockfile as a permanent fix,
- distinguish application-code failure from dependency-resolution failure,
- report warnings separately from build-breaking failures.

## Production-readiness questions

Ask:
1. Can this fail partially?
2. Can it run twice?
3. Can two copies run simultaneously?
4. Can another user call it?
5. Can input be manipulated?
6. Can a dependency hang?
7. Can the response leak data?
8. Can the database reject it?
9. Can operators diagnose it?
10. Can an old app version coexist during deployment?
11. Can existing data violate the new assumption?
12. What protects the invariant when the application has multiple instances?

## Review output format

When reviewing backend code, provide findings by severity, but do not manufacture issues.

For each material issue state:
- location/component,
- current behavior,
- why it is incorrect/risky,
- failure scenario,
- minimal recommended fix,
- whether the database/service/API layer should enforce it.

Separate:
- confirmed bugs,
- security vulnerabilities,
- architecture/maintainability issues,
- assumptions requiring repository/schema verification.
