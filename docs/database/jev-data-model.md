# Platform data model and JEV extension

## Core platform persistence

PostgreSQL stores the platform independently of model judgments. `scripts/migrate.ts` defines the complete current migration order; an off-mode install still uses that schema. Source and registered SQL files override historical proposals below.

| Data family                          | Responsibility                                      | Evidence                                                                                        |
| ------------------------------------ | --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| sources, jobs                        | Shared listing identity and content                 | db/001_initial.sql and later source migrations; src/lib/sync.ts                                 |
| users, user_sessions                 | Accounts, roles and hashed session tokens           | db/007_user_auth.sql; src/lib/auth.ts                                                           |
| monitors, monitor_matches            | Personal rules and derived matches                  | db/008_personal_onboarding.sql, db/012_incremental_matching.sql; src/lib/matching-repository.ts |
| job_user_states                      | User/job status, review state and later note fields | db/009_personal_job_states.sql; src/lib/actions/job-state.ts                                    |
| sync_runs, sync_run_jobs             | Collection outcomes and listing membership          | db/010_run_job_results.sql; src/lib/sync.ts                                                     |
| security_events, request_rate_limits | Audit and shared throttling                         | db/028_security_audit.sql, db/030_request_rate_limits.sql                                       |
| schema_migrations                    | Applied migration ledger                            | scripts/migrate.ts                                                                              |

Source/external ID identifies a listing; user/job identifies personal tracking. Rebuilding derived matches must preserve personal state. Monitor operations own atomic matching updates; matching persistence receives the caller's query client. Collection write/run bookkeeping is separate from model calls.

The migration runner uses a transaction advisory lock and an explicit ordered file list. Creating a SQL file alone does not register it. PGlite tests do not certify production PostgreSQL migrations or backup restoration. See [system data model](../architecture/system.md#data-model) and [operations](../operations/runbook.md).

## JEV extension and historical design

The following sections retain the proposed intelligence schema. Check actual columns and later additions against registered migrations, starting at `db/018_job_intelligence.sql`, and current repositories. Proposed fields are not claims about a deployed database.

## Design goals

- Add intelligence without changing source or user ownership.
- Keep every model decision auditable and replayable.
- Separate immutable evaluations from the current read-optimized profile.
- Prevent an old response from replacing a newer job version.
- Support shadow comparison and immediate rollback.

Table and column names below are proposed. The implementation migration must use
the next available migration number and follow existing SQL conventions.

## `job_intelligence_queue`

Durable PostgreSQL outbox and work queue.

| Column                      | Purpose                                        |
| --------------------------- | ---------------------------------------------- |
| `id uuid`                   | Queue identity                                 |
| `job_id uuid`               | Existing `jobs.id`, cascade on deletion        |
| `content_hash text`         | Hash of classification-relevant job state      |
| `question_set_version text` | Contract version                               |
| `status text`               | pending, processing, retrying, succeeded, dead |
| `attempts integer`          | Attempt count                                  |
| `available_at timestamptz`  | Earliest claim time                            |
| `locked_at timestamptz`     | Claim recovery support                         |
| `locked_by text`            | Worker instance identifier                     |
| `last_error_code text`      | Stable, non-sensitive category                 |
| `created_at`, `updated_at`  | Operational timestamps                         |

Constraints and indexes:

- unique `(job_id, content_hash, question_set_version)`;
- claim index on `(status, available_at)`;
- index on `job_id`;
- check constraints for status and non-negative attempts.

The worker claims rows with `FOR UPDATE SKIP LOCKED`. A lease timeout returns an
abandoned processing row to retrying.

## `jev_evaluations`

Append-only record of validated and rejected responses.

| Column                      | Purpose                                              |
| --------------------------- | ---------------------------------------------------- |
| `id uuid`                   | Evaluation identity                                  |
| `job_id uuid`               | Evaluated job                                        |
| `queue_id uuid`             | Originating work item                                |
| `content_hash text`         | Exact state identity                                 |
| `state_hash text`           | Audit hash of bounded state                          |
| `question_set_version text` | Question contract                                    |
| `model_identifier text`     | Value returned/configured for the pinned integration |
| `response jsonb`            | Validated structured decisions and probabilities     |
| `policy_status text`        | accepted, shadow_only, review, rejected              |
| `policy_reasons text[]`     | Stable rule identifiers                              |
| `latency_ms integer`        | Provider latency                                     |
| `usage jsonb`               | Provider usage metadata when supported               |
| `error_code text`           | Present for rejected calls/responses                 |
| `created_at timestamptz`    | Immutable timestamp                                  |

The application does not update evaluation answers. A manual correction is a
separate override record.

## `job_intelligence_profiles`

Current materialized classification used by reads and assisted matching.

| Column                      | Purpose                               |
| --------------------------- | ------------------------------------- |
| `job_id uuid primary key`   | One current profile per job           |
| `evaluation_id uuid`        | Accepted source evaluation            |
| `content_hash text`         | Must match the current job state      |
| `role_family text`          | Approved role family                  |
| `career_stage text`         | internship, entry, mid, senior, other |
| `work_arrangement text`     | onsite, hybrid, remote, unclear       |
| `technology_relevance real` | Validated Noul value                  |
| `content_quality text`      | usable, sparse, malformed, non-job    |
| `confidence jsonb`          | Per-question confidence only          |
| `needs_review boolean`      | Ambiguity/conflict marker             |
| `policy_version text`       | Materialization policy                |
| `updated_at timestamptz`    | Current-profile timestamp             |

Application checks constrain enums and probability ranges. A trigger or guarded
repository update prevents materialization when the evaluation job/content
identity does not match.

## `job_intelligence_overrides` (assisted rollout)

Owner corrections are append-only and never overwrite the original JEV answer.

| Column                               | Purpose                        |
| ------------------------------------ | ------------------------------ |
| `id uuid`                            | Override identity              |
| `job_id uuid`                        | Corrected job                  |
| `field text`                         | Corrected classification field |
| `old_value jsonb`, `new_value jsonb` | Audit values                   |
| `reason text`                        | Required human rationale       |
| `created_by uuid`                    | Owner user id                  |
| `created_at timestamptz`             | Audit timestamp                |

Overrides are applied by deterministic precedence rules and become labeled
examples for evaluation. They are not automatically sent for training.

## Requirement evidence (later migration)

Do not add these tables in the first release. After classification is stable:

- `job_requirements`: normalized requirement, category, importance, evidence
  text, source offsets, classifier answer, confidence, and version;
- `job_requirement_groups`: AND/OR grouping inferred only from explicit
  deterministic syntax or reviewed decisions.

An accepted requirement must point to source evidence. JEV may label supplied
phrases; it may not create unsupported requirements.

## Tenancy and access

Job intelligence attaches to shared jobs and is computed once per content
version. It does not contain a `user_id`. User-specific relevance is derived by
joining the shared profile to monitors owned by the authenticated user.

Personal saved, applied, archived, and reviewed state remains in
`job_user_states`. Monitor ownership remains in `monitors.user_id`. JEV tables
must not duplicate these values.

Owner diagnostics may query queue/evaluation health. Member-facing repository
methods expose only approved profile fields for jobs already authorized by the
existing visibility rules.

`ai_usage_policy` is a singleton owner-managed policy containing the daily
member job-analysis limit. `ai_job_analysis_usage` records a reservation,
success, or failure for one user/job/day. Successful and active reservations
count; failed reservations do not, and abandoned reservations expire after ten
minutes. Owners do not create quota reservations. `request_rate_limits`
separately protects authenticated mutation routes and is not a billing or
analytics source.

## Retention and privacy

- Never persist the JEV API key.
- Do not store session tokens, user email, monitor owner, or personal workflow
  state in JEV requests/evaluations.
- Retain hashes and structured decisions longer than raw diagnostic snapshots.
- Redact request bodies from logs and exception telemetry.
- Define evaluation and dead-letter retention before assisted rollout.
- A deleted job cascades to its queue, evaluations, profile, and overrides.
- Candidate/CV rows are private to `user_id`, require explicit approval, can be
  exported or deleted by that user, and never contain the original PDF bytes.

## Migration and rollback

All schema changes are additive. Existing matching queries remain valid when
JEV tables are empty. Turning `JEV_MODE` off stops new work and causes reads to
ignore intelligence profiles; it does not require dropping data or reversing a
migration.
