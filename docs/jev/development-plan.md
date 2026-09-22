# JEV development plan

This plan is sequenced so each stage is independently reviewable and can stop
without weakening the current product.

## Stage 0 — contract and feasibility spike

Goal: remove external API uncertainty before database or product work.

Deliverables:

- pin a reviewed `@typesafe-ai/sdk` version;
- verify environment configuration, exact request/response types, model
  selection, timeout, rate-limit, usage, and error behavior;
- run a small local fixture set containing clear and ambiguous job examples;
- measure typical state size and latency;
- document TypeSafe data retention and production limits;
- decide the bounded state size and initial worker concurrency;
- capture the verified contract as test fixtures with secrets and job text
  redacted.

Exit gate:

- The team can make one typed JEV request in a disposable spike and validate
  all expected and failure responses.
- No unverified endpoint, model alias, or pricing assumption is required by the
  production design.

## Stage 1 — domain contract and offline evaluation

Goal: prove that the question set measures the decisions Jobradar needs.

Deliverables:

- versioned `job-classification-v1` question definitions;
- bounded deterministic state builder;
- labeled gold set sampled across every active source and career stage;
- adversarial fixtures for compound titles and numbered/Roman levels;
- comparison report against the current deterministic classifier;
- initial per-question confidence policy derived from results.

Exit gate:

- Reviewers approve the labels and question wording.
- No senior/internship job is promoted into an incompatible early-career set in
  the release gold set.
- Metrics are segmented by source so aggregate results cannot hide a failing
  connector.

## Stage 2 — additive persistence and worker

Goal: run JEV reliably without affecting the UI or current matching.

Deliverables:

- queue, evaluation, and profile migrations;
- server-only JEV client with validated responses;
- queue claim, lease recovery, retry, dead-letter, and circuit-breaker logic;
- content-hash idempotency and stale-response protection;
- separate intelligence worker command;
- health counters and owner diagnostics;
- unit and PostgreSQL integration tests with a fixed fake client.

Exit gate:

- Source sync succeeds while the fake JEV service times out or fails.
- Duplicate work cannot produce duplicate current profiles.
- A response for old job content cannot overwrite the current profile.
- Logs and stored diagnostics contain no secret or unexpected personal data.

## Stage 3 — production shadow mode

Goal: observe real decisions with zero user-visible behavior change.

Deliverables:

- `JEV_MODE=shadow` deployment;
- controlled backfill ordered by newest active jobs;
- deterministic-versus-JEV comparison dashboard/report;
- cost, latency, abstention, queue-age, and error measurements;
- owner review flow for conflicts and malformed listings;
- revised policy thresholds and question-set version if needed.

Exit gate:

- Queue age and failure rates stay within the operational budget agreed after
  Stage 0.
- Career-stage, technology-relevance, and work-arrangement gates in
  [evaluation-and-rollout.md](evaluation-and-rollout.md) pass.
- The rollback drill proves that disabling JEV leaves collection and matching
  healthy.

## Stage 4 — assisted matching

Goal: improve ambiguous matches while preserving hard exclusions.

Deliverables:

- repository queries that consume approved current profiles;
- deterministic conflict and fallback policy;
- incremental rematch after profile materialization;
- structured explanation clauses in job rows/details;
- owner-only manual corrections with audit history;
- staged enablement by source and question field.

Promotion order:

1. content quality and non-job suppression;
2. technology relevance;
3. work arrangement where the source is ambiguous;
4. role family;
5. career stage last, because leakage has the highest user impact.

Exit gate:

- Assisted results meet the same gold-set gates and a live sampled review.
- Member visibility remains scoped to personal monitors.
- Disabling one field or all JEV policy restores deterministic behavior without
  migration or redeploy.

## Stage 5 — evidence-backed requirements (optional)

Goal: add requirement comparison without a generative parser.

Deliverables:

- deterministic candidate-phrase extraction;
- evidence offsets and normalized requirement schema;
- JEV question set that labels supplied phrases only;
- reviewed handling of AND/OR groups and missing evidence;
- independent evaluation and rollout gates.

This stage begins only after Stage 4 is stable. Candidate profiles and CVs are
still out of scope.

## Stage 6 — candidate and application capabilities (separate initiative)

Before this stage, approve product scope, consent, access controls, deletion,
retention, evidence editing, and data-export requirements. The original context
contains useful ideas, but it is not authorization to store candidate documents
or automate applications.

## Pull request sequence

Keep implementation reviews small:

1. ADR, pinned SDK, contract fixture, and configuration validation.
2. State builder and offline evaluation harness.
3. Additive database migration and queue repository.
4. JEV client and intelligence worker with fake-client tests.
5. Shadow instrumentation and owner diagnostics.
6. One assisted field at a time after its promotion gate.

Each pull request must document its rollback, data migration effect, test
evidence, and whether it changes user-visible matching.

## Configuration proposal

Names are provisional until Stage 0 confirms the SDK:

```text
TYPESAFE_API_KEY=<server-only secret>
JEV_MODE=off|shadow|assisted
JEV_QUESTION_SET=job-classification-v1
JEV_REQUEST_TIMEOUT_MS=<measured value>
JEV_WORKER_CONCURRENCY=<measured value>
JEV_MAX_ATTEMPTS=<operational policy>
```

Production must fail configuration validation when JEV is enabled without a
valid key. Development and test default to `off` and never make an implicit
network call.

## Definition of done

The integration is complete only when:

- JEV is the sole model-based dependency;
- current source collection remains independent of JEV availability;
- every promoted answer is versioned, validated, auditable, and reversible;
- owner/member visibility and personal workflow state remain correct;
- career-stage hard gates prevent incompatible recommendations;
- measured evaluation supports every enabled decision field;
- operational documentation covers credentials, outage response, replay,
  rollback, and deletion;
- no generated prose or unsupported requirement appears as source fact.
