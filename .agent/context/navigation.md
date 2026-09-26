# Navigation

All source/test paths below are repository-relative. Read only relevant entries.

| Topic              | Source                                                                                           | Checks                                                                        | Authority                         |
| ------------------ | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | --------------------------------- |
| Workspace          | src/components/dashboard.tsx; src/components/dashboard/; src/components/workspace-page.tsx       | typecheck, browser interactions                                               | docs/architecture/system.md       |
| Actions            | src/app/api/actions/route.ts; src/lib/actions/                                                   | tests/actions.test.ts                                                         | docs/security/security-audit.md   |
| Matching           | src/lib/matching.ts; src/lib/matching-repository.ts                                              | tests/core.test.ts; tests/database.test.ts; tests/matching-repository.test.ts | docs/architecture/system.md       |
| Collection         | src/lib/connectors.ts; src/lib/sync.ts                                                           | tests/core.test.ts; tests/sync.test.ts                                        | docs/api/source-integrations.md   |
| Authentication     | src/lib/auth.ts; src/lib/security.ts; src/lib/rate-limit.ts                                      | tests/auth.test.ts; tests/security.test.ts; tests/rate-limit.test.ts          | docs/security/security-audit.md   |
| JEV                | src/lib/jev/; src/lib/intelligence/                                                              | tests/jev.test.ts; tests/intelligence.test.ts; tests/requirements.test.ts     | docs/api/jev-decision-contract.md |
| Candidate evidence | src/lib/cv/; src/lib/ocr/                                                                        | tests/cv.test.ts; tests/cv-review.test.ts; tests/image-context-route.test.ts  | docs/architecture/jev.md          |
| Database           | src/lib/db.ts; scripts/migrate.ts; db/                                                           | tests/database.test.ts; tests/database-config.test.ts                         | docs/operations/runbook.md        |
| Onboarding         | src/app/api/onboarding/route.ts; src/lib/actions/monitors.ts                                     | tests/database.test.ts; tests/actions.test.ts                                 | docs/architecture/system.md       |
| Focused reads      | src/lib/focused-repository.ts; src/app/api/jobs/route.ts; src/app/api/workspace/summary/route.ts | tests/database.test.ts                                                        | docs/api/source-integrations.md   |
| Personal tracking  | src/lib/actions/job-state.ts; src/app/api/actions/route.ts                                       | tests/actions.test.ts                                                         | docs/database/jev-data-model.md   |
| Agent workflow     | .agent/scripts/; .agent/schemas/                                                                 | tests/agent-workflow.test.ts                                                  | AGENTS.md                         |

Migrations use an explicit list in scripts/migrate.ts; a new SQL file alone is
not registered. PGlite tests do not certify a production migration or restore.
Check imports and shared SQL/types when selecting additional verification.

## Context routing

Use the task-to-context table in [the workflow guide](../../docs/operations/agent-workflow.md).
Load one to three context files before searching source. Architecture changes use
[architecture](architecture.md); access changes use [security](security.md);
dependency work uses [dependencies](dependencies.md). Shared procedures live in
.agent/skills/; current task state lives in .agent/tasks/.

## Skills and decisions by task

Use the source/test table above first, then select only relevant workflows. Skill paths below refer to canonical procedures; tool discovery copies are generated.

| Task area                         | Relevant skills under .agent/skills                                       | Decision/context to inspect                                                                              |
| --------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Authentication and account access | implementation, security-review, verification                             | docs/architecture/system.md; docs/security/security-audit.md; no separate auth ADR is currently recorded |
| Database/schema changes           | architecture-analysis, implementation, verification                       | docs/database/jev-data-model.md; scripts/migrate.ts; no dedicated migration skill is currently installed |
| Matching and JEV integration      | architecture-analysis, implementation, verification                       | docs/architecture/adr-001-jev-only-decision-layer.md; docs/api/jev-decision-contract.md                  |
| Small dashboard/UI edits          | implementation, verification                                              | Relevant component and styles; load broader architecture only if boundaries change                       |
| Dependency changes                | change-planning, implementation, verification                             | .agent/context/dependencies.md and installed package metadata                                            |
| Workflow and task recovery        | repo-discovery, verification                                              | .agent/memory/decisions/ADR-001-shared-agent-workflows.md; docs/operations/agent-workflow.md             |
| Review or release                 | code-review or security-review; release only for an explicit release task | Current diff, task evidence and docs/operations/runbook.md                                               |

Task recovery starts with saved state/plan and current Git, not conversation history. Use `npm run agent:changed-files -- --resume <id>` for a read-only diagnostic; its zero exit means no recorded mismatch, not that prior tests remain valid.
