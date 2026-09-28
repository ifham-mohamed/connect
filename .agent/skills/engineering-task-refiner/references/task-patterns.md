# Engineering task patterns

Select the closest row, then read its section. Use only relevant fields. Small
tasks should not inherit the ceremony of large tasks. Full-stack work combines
the feature, UI, and API patterns only where needed.

| Request                             | Pattern                      |
| ----------------------------------- | ---------------------------- |
| Localized incorrect behavior        | Tiny bug                     |
| Failure with uncertain cause        | Unknown bug                  |
| Bounded behavior addition           | Small feature                |
| Screen, layout, interaction         | Frontend/UI                  |
| Endpoint or server operation        | Backend/API                  |
| Several dependent capabilities      | Large feature                |
| Internal structure change           | Refactor                     |
| Latency, resource use, throughput   | Performance                  |
| Vulnerability or access change      | Security                     |
| Schema or stored-data transition    | Database migration           |
| Library/runtime version change      | Dependency/framework upgrade |
| Deployment/runtime configuration    | Infrastructure/DevOps        |
| Build or release automation         | CI/CD                        |
| Active service disruption           | Production incident          |
| Explain cause or feasibility        | Investigation                |
| Behavioral coverage gaps            | Test improvement             |
| Assess changes without implementing | Code review                  |
| Choose module boundaries or design  | Architecture/design          |

## Tiny bug

Observed behavior → expected behavior → reproduce/trace → establish cause →
minimal fix → original failure and normal-path verification. Identify the failing
case first. Add a regression test when it protects meaningful behavior.

## Unknown bug

Symptoms → reproduction → execution flow → evidence → root cause → fix →
regression verification. Separate observations from hypotheses. A user's suspected
cause is not established evidence; avoid prescribing a fix before investigation.

## Small feature

Goal → current behavior → requirements → existing patterns → constraints →
acceptance criteria → verification. Reuse the nearby implementation when suitable;
avoid speculative abstractions and unrelated cleanup.

## Frontend/UI

Identify the affected screen and supplied design. Inspect existing components,
tokens, breakpoints, and interactions. Include applicable keyboard, focus,
semantic, and accessible-name behavior. Specify loading, empty, error, disabled,
and success states only when relevant to the flow and established requirements.
Use appropriate visual/browser checks for changed interactions or layout.
Do not invent a new design system or product behavior.

## Backend/API

Contract → authentication and ownership/authorization → validation → business
rules → persistence/transaction ownership → errors → consumer compatibility →
verification. Inspect current callers and server enforcement. Cover success,
invalid input, unauthenticated/unauthorized access, and relevant failures without
assuming that every server function is an HTTP endpoint.

## Large feature

Required outcome → repository investigation → affected boundaries and data flow →
design → dependencies → independently verifiable milestones. Establish contracts,
access rules, data transitions, and UI scope where affected before implementation.
Record consequential decisions in the existing project workflow; do not add
infrastructure or a separate planning system to match this pattern.

## Refactor

Separate goals from non-goals. Preserve externally observable behavior unless
explicitly asked to change it. Identify consumers and contracts, establish behavior
before editing, and verify it afterward. Do not combine refactoring with new
features or redefine behavior to match the new structure.

## Performance

Baseline → reproducible measurement → bottleneck evidence → targeted optimization →
same-workload before/after comparison and correctness checks. Use a numerical
target only if supplied or agreed. Never claim improvement from intuition alone.

## Security

Affected assets → trust boundaries → access expectations → evidence → server-side
enforcement → abuse and regression cases. Consider sensitive-data exposure and
owner/member isolation where relevant. UI restrictions are not authorization.
Do not infer permission to probe production from a local security task.

## Database migration

Current schema and affected data → desired state → application compatibility →
transition/backfill sequence → deployment ordering → failure/retry handling →
rollback or recovery → validation. Inspect local schema and migration tooling
first. Jobradar registers migrations explicitly in `scripts/migrate.ts`; a SQL
file alone is insufficient. Local PGlite checks do not certify a live migration
or restore. Preparing a migration does not authorize running it on live data.

## Dependency/framework upgrade

Installed version → requested target → current official migration guidance →
breaking/deprecated APIs and affected usage → compatible dependency changes →
verification. If no target is established, resolve that choice before changing
versions. Separate framework assumptions from evidence in installed documentation.

## Infrastructure/DevOps

Actual configuration → desired behavior → affected services, secrets, storage,
and network boundaries → minimal change → configuration/health checks → recovery
when applicable. Keep live operations within explicit authorization and avoid
exposing secret values. Do not invent orchestration layers.

## CI/CD

Current triggers and flow → desired flow → branches/environments → artifacts and
required gates → failure behavior → verification. Check that failing gates block
the intended downstream action. Distinguish local validation from an actual hosted
run; do not publish or deploy solely to test a workflow.

## Production incident

Impact → known timeline → available evidence → hypotheses → authorized mitigation
→ root cause → corrective and preventive work. Prioritize service stabilization
within scope; timing alone does not prove causation. Keep unknown causes explicit
and redact private data in evidence.

## Investigation

Question → relevant source/runtime evidence → confirmed findings and hypotheses
→ affected areas → risks → next action. Do not turn investigation-only requests
into edits. State when evidence is insufficient to establish a cause.

## Test improvement

Existing behavior and test conventions → meaningful coverage gap → behavioral
case → relevant suite. Favor success, boundary, regression, failure, and access
cases that matter over a coverage percentage or tests mirroring implementation.

## Code review

Review scope/revision → relevant diff and callers → concrete regression/security
evidence → prioritized actionable findings → test gaps. Keep review-only work
read-only, distinguish uncertainty from a finding, and report no findings when
warranted. Do not silently fix, merge, or release reviewed code.

## Architecture/design

Required outcome → current boundaries and constraints → viable options and
tradeoffs → recommendation → unresolved decisions → validation approach. Follow
the existing architecture authority. Design-only work does not authorize changing
service boundaries or implementing the recommendation.

## Combining patterns

An unexplained access failure may need Unknown bug + Security. A slow endpoint
may need Performance + Backend/API. Combine only sections that change the actual
investigation or acceptance checks; do not append every quality concern.
