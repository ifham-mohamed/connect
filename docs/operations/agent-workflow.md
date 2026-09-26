# Shared development workflow

AGENTS.md contains universal policy. CLAUDE.md imports it. The supplied orchestration blueprint stays unchanged as reference material. This layer does not change application behavior, JEV policy, schema or deployment.

## Load context progressively

Start with Git HEAD/status and project/navigation context. Select one to three documents using this table, then inspect exact source symbols. Do not load all skills or historical tasks.

| Task                        | Context                                      | Shared skill          |
| --------------------------- | -------------------------------------------- | --------------------- |
| Locate unfamiliar code      | project, navigation                          | repo-discovery        |
| Change module boundaries    | architecture, conventions                    | architecture-analysis |
| Authentication/private data | security, navigation                         | security-review       |
| Dependency change           | dependencies, conventions                    | change-planning       |
| Implement feature/fix       | navigation, conventions                      | implementation        |
| Validate changes            | conventions                                  | verification          |
| Review a diff               | navigation, architecture                     | code-review           |
| Explicit release task       | security, dependencies, operations authority | release               |

Context under .agent/context describes the system and links authorities. Decision memory records accepted reasons; lessons are curated recurring knowledge; known-issues records limitations with evidence. Task memory records current work. Keep disposable investigations in ignored artifacts, with no sensitive user data. Existing documents are organized under docs/architecture, docs/api, docs/database, docs/security and docs/operations; skills/ reference assets remain in place.

## Commands

| Command                                                | Effect                                                                                             |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| npm run agent:context-check                            | Read-only validation of task contracts, context links, source indices and skill-copy drift         |
| npm run agent:update-index                             | Check static index freshness; nonzero when stale                                                   |
| npm run agent:update-index -- --write                  | Explicitly rebuild navigation after reviewing source changes                                       |
| npm run agent:sync-skills                              | Check discovery copies against canonical skills                                                    |
| npm run agent:sync-skills -- --write                   | Replace discovery copies from canonical skills; inspect local edits first                          |
| npm run agent:changed-files                            | Emit current Git status, including rename paths; no file writes                                    |
| npm run agent:impact -- src/lib/matching-repository.ts | List transitive static import candidates; reads current source and retains cached historical edges |
| npm run agent:verify -- --docs                         | Context and formatting checks only                                                                 |
| npm run agent:verify                                   | Context, formatting, architecture, lint, types and complete Vitest suite                           |
| npm run agent:verify -- --application                  | Also run production build                                                                          |

Generated indices include source hashes, top-level named exports, static imports and declared package ranges. Ownership means module responsibility, not personal authorization. The TypeScript resolver handles local aliases; unresolved/external edges remain visible. Git and ripgrep are the file/text baseline. TypeScript supplies symbol/import navigation. The TypeScript language-service command resolves definitions and references on demand. SQLite FTS5 searches current documentation in memory; embeddings remain unnecessary for this local documentation set. Text hashes normalize CRLF to LF for cross-platform index checks. A new HEAD alone does not invalidate unchanged indexed content; verification records still retain the exact Git baseline and raw source/diff hashes.

Index updates do not validate behavior or retroactively refresh old test evidence. Check-only commands never rewrite sources. Generated copies are byte-identical to canonical skills and are checked for drift. Unknown skill directories are reported and never automatically deleted.

## Resume and hand off

Create .agent/tasks/<id>/ with brief.md, plan.md, state.json, findings.md and verification.md. Use the task-state schema for required fields. Record HEAD, initial working-tree changes, intended scope, one implementation owner, completed and remaining work. A handoff.json uses the handoff schema. Compare it with current Git state before continuing.

Capture changed-files.json from the read-only change command when a checkpoint needs it. It is a historical Git observation, not agent authorship and not a permanently fresh index. The index-level changed-files.json is also a dated checkpoint; use the command for current state. Exclude these snapshots from conclusions about who made a change.

Verification writes current machine evidence under ignored artifacts/agent/verification.json: commands, exit codes, source/diff hashes and skipped checks. Summarize outcomes in the task verification document. Later source changes invalidate applicability; never describe historical results as current. Do not mark a skipped build as passed.

## Tool adapters

Canonical skills live under .agent/skills. Generated .agents/skills and .claude/skills enable project discovery using each tool's supported directories. The guides use repository-root paths, so copied instructions do not depend on their installation depth. See [Codex skills](https://developers.openai.com/codex/skills/) and [Claude skills](https://code.claude.com/docs/en/skills).

The native .codex/config.toml and .mcp.json configure the local read-only MCP server as the implementer role. Start clients from the repository root; project trust/restart may be required for native configuration changes. The checked-in Claude settings connect session, edit and compaction events to the shared lifecycle script. Git hooks use the same verification command after explicit local installation. Project adapters contain no credentials and do not change application JEV providers. See the [Codex MCP configuration](https://developers.openai.com/codex/mcp/) and [Claude hooks contract](https://code.claude.com/docs/en/hooks).

The portable plugin at .agent/plugins/repository-search contains only the dependency-free search procedure and implementation. The project search command imports that same implementation, avoiding a second maintained copy. Its validated manifest supports manual local installation; it has not been published or installed globally.

## Repository map and impact

The map describes one jobradar package with reviewed subsystem roots, entry points, tests, documentation and conceptual dependencies. These conceptual relationships include HTTP and shared database coupling and are not a package installation graph. Edit .agent/scripts/subsystems.mjs, inspect actual source, then explicitly refresh indices. Context checks reject missing mapped paths and unknown subsystem dependencies.

Impact analysis reads current source without requiring a cache refresh. Historical cached import edges remain conservative candidates for renamed/deleted files and are labelled accordingly. It reports affected imports, mapped regression tests, documentation, API routes, interface candidates, schema/configuration paths and manual review questions. Unmapped files are explicitly reported. SQL semantics, environment changes and dynamic routing still require review; no impact report marks a change verified.

Use `npm run agent:changed-files -- --task impact-upgrade` for a task-associated Git observation. It includes the recorded baseline, owner and intended scope without assigning authorship to current edits. Record file-specific reasons in findings.md after inspecting the actual diff. Use git diff --name-status, --numstat and --stat for review, and git log --oneline -- <file> for history.

## Enforced architecture

`npm run agent:architecture-check` checks resolved imports from current source, covering aliases and explicit extensions as well as ordinary relative imports. Existing ESLint restrictions remain; regression tests prove prohibited matching/collection and action/presentation dependencies fail. The verification command runs this gate automatically for code changes. It enforces the accepted extractions, not a hypothetical domain/infrastructure layering. Nonliteral dynamic imports require review. The GitHub Actions workflow in .github/workflows/verify.yml runs the application gate on Node 24 without production credentials. Local checks do not certify a hosted run; no push is performed by this task.

## Capability boundaries

| Mechanism        | Jobradar role                                                          |
| ---------------- | ---------------------------------------------------------------------- |
| AGENTS.md        | Universal project rules                                                |
| Context and ADRs | Project knowledge and accepted decisions                               |
| Skills           | The eight focused reusable workflows                                   |
| Scripts          | Deterministic navigation and checks                                    |
| Hooks            | Local lifecycle events, context invalidation and verification gates    |
| MCP              | External/live capabilities only when a task needs them                 |
| Plugins          | Portable cross-project bundles; keep Jobradar-specific rules here      |
| Subagents        | Explicitly scoped independent work; no automatic delegation configured |
| CI               | Configured hosted execution of the same application gate               |

Prefer Git, shell, exact search and TypeScript tools for repository work. Select a skill for a recurring procedure. Use MCP only for needed external information/actions, with the smallest tool and permission scope; use a plugin when a capability bundle must be portable. Available credentials or tools do not authorize writes.

Planner/reviewer tasks need repository, diff, tests and relevant documentation. Implementation needs local source and checks. A database investigation should start with local schema and tests; a live connection, if explicitly needed, should be read-only by default. Release capabilities are selected only for an authorized release task. Never copy credentials into project settings or expose every server to every role. The read-only local MCP server exposes only role-allowed tools from .agent/capabilities.json. Public official documentation and the configured GitHub repository can be read; arbitrary URLs and all writes are rejected. The optional GITHUB_TOKEN stays in the process environment. Native defaults expose only documentation; a planner/reviewer invocation may use the configured repository and issue readers. Role names are capability selection, not authentication against a malicious local process. Specialized skills should be added only for repeated demonstrated tasks, with narrow triggers and progressive references.

## Documentation organization

Use README.md as the repository reading guide. Architecture and accepted decisions live under docs/architecture; API and source integration contracts under docs/api; database design under docs/database; security reviews under docs/security; runbooks, delivery plans, historical stage reports and developer workflows under docs/operations. Reuse an existing document before adding another. The JEV overview links its documents across these subjects.

The original orchestration blueprint remains byte-preserved reference material under docs/architecture. Completed task records and Git status snapshots preserve historical filenames and hashes; they are not navigation authorities. Current context, skill copies, subsystem mappings and indices use the relocated paths. Context checks validate relative document links and mapped paths; original blueprint examples are excluded from link validation.

## Adaptive task lifecycle and ownership

Use intake → classify → discover → impact → plan → implement → verify → review → record → update index → close for substantial work. These are work stages, not new mandatory state.json enum values. Use the existing planned/implementing/verifying/blocked/complete states, with completed and remaining arrays recording progress. Close only after required checks pass or unresolved limitations are explicitly recorded rather than called complete.

A typo needs inspect → edit → verify. A localized feature needs a short plan and relevant checks. Multi-module work needs impact discovery, staged implementation and review. A consequential architecture change needs an accepted decision record before broad implementation. External or destructive actions must stay within actual user authorization; prepare a concrete reviewable result before requesting missing authorization. Do not add task ceremony to trivial changes.

One lead owns the task and integrates evidence. Explorer, architecture analyst, implementer, verifier and reviewer are roles selected only as needed, not permanently running services. Keep one implementation owner for overlapping files. Codex and Claude may exchange analysis/review roles, but do not independently edit the same feature unless an explicit comparison is intended. Delegation requires an authorized concrete independent workstream; this guide does not start agents or configure automatic orchestration. A local review is not a claim that an independent reviewer ran, and local checks are not a claim that hosted CI exists.

## Compact handoff using existing contracts

Use `.agent/schemas/handoff.schema.json`; do not invent a second incompatible format or copy the full conversation. The current fields are schema_version, task_id, goal, constraints, evidence, changed_files, verification and remaining. Link source findings and relevant files through evidence; put open questions and the next action in remaining. Owner, baseline commit and lifecycle status live in the task's state.json. Verification entries distinguish passes, failures and skips.

On resumption inspect HEAD and Git status, compare the recorded baseline, inspect current diffs, validate context and re-read changed source before acting. A changed_files list is an observation, not proof of authorship. Do not transfer secrets, candidate documents or transcripts. Use findings.md for concise reviewed reasons; preserve historical evidence instead of silently rewriting it to match a new checkout.

## Evidence, decisions and invalidation

For each durable architectural claim retain the source path and relevant symbol, the inspected baseline HEAD, and applicable content hash or verification report. Current HEAD alone is insufficient for a dirty tree. Generated repo-map hashes describe current files; task verification records command outcomes and source/diff hashes. Label evidence as source inspection, automated test, browser observation, historical report or proposal. Runtime health needs executed runtime evidence; a source read or test fixture does not establish deployment health.

If a source hash changes, the related remembered claim needs reinspection. Re-read the relevant symbol, review the diff, rerun checks warranted by the change, then explicitly refresh the index. A new index hash never refreshes old test evidence. Treat task state as coordination memory and Git as the change authority.

For a consequential accepted decision record status, context, decision, considered alternatives, consequences and evidence. Keep development-workflow decisions under .agent/memory/decisions; link existing application decisions such as the JEV ADR rather than duplicating them. Source-grounded descriptions of an existing design do not automatically require a new ADR.

## Parallel worktrees and temporary ownership

Independent Codex and Claude writers must not edit the same checkout concurrently. Use isolated Git worktrees for authorized independent implementation tasks; a single-owner task may continue in its existing checkout. A reviewer should read a fixed diff or isolated checkout and leave implementation to the owner. Default new branch names use codex/; record the actual branch rather than rename a user's existing branch.

Inspect git status and git worktree list --porcelain before setup or resumption. A new worktree starts from a Git revision and does not automatically contain this checkout's uncommitted work. Select a baseline deliberately and coordinate any transfer without discarding the original changes. Never create a commit solely to make worktree setup convenient when commits are prohibited. Worktree removal needs inspection for retained edits and the appropriate authorization.

The optional workspace object in task state records branch, worktree and claimed_files. Worktree is relative to the coordinating checkout (or an explicit absolute path); claimed_files are repository-relative exact files or directory prefixes. Existing task records remain valid without workspace metadata. Use narrow claims, mark complete only when done and release claims through that state transition. Blocked tasks retain claims until the lead explicitly resolves ownership.

Context checks reject overlapping claims among non-complete task records. The coordinate command additionally maintains atomic claims under the shared Git common directory, so worktrees see the same registry. It validates the actual checkout and branch before claiming, records a Git checkpoint and rejects another owner or checkout releasing a claim. Use claim before editing and release after completion. A lock directory serializes updates; after a crash inspect its owner/process before manually resolving a stale lock. Declared ownership does not prove who wrote existing changes and cannot prevent arbitrary editors from bypassing the workflow.

Use npm run agent:coordinate -- status, then claim <task-id> or release <task-id>. The branch and workspace must match state.json. Use Git's native worktree command with a reviewed baseline and a codex/ branch for an authorized second writer; it does not copy dirty changes. Do not start parallel writers automatically. The module ownership index remains navigation, separate from the shared task-claim registry.

## Deterministic verification and evidence

Keep npm run agent:verify as the single verification interface: context and formatting, resolved architecture boundaries, ESLint, TypeScript and the entire Vitest suite. --application adds the production build. --docs is limited to documentation changes. The suite includes authentication, security, rate-limit and database regression coverage, but is not a new static vulnerability scanner. Browser checks remain explicit for UI changes; PGlite is not live PostgreSQL certification. Impact analysis supplies candidates, never permission to skip the full suite for application changes.

Use the installed stack. No Ruff, Pyright, pytest, second JavaScript test framework, browser-test dependency, Semgrep, CodeQL, hook manager or new dependency is installed by this adaptation. Add tooling only when a concrete gap warrants it. Verification must not migrate, collect sources, backfill, rematch, contact live JEV or deploy.

Record each command and exit code, inspected source/diff hashes, test scope, build outcome, manual observation and remaining risks. Use PASS only for executed successful checks, FAIL for failures, and SKIPPED with reasons. Unverified runtime scenarios remain limitations. Preserve the existing verification.md and machine report rather than inventing a second report convention.

## Action classes and secret handling

| Class  | Examples                                                                                                          | Required handling                                                                                                                                                    |
| ------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Green  | Read/search, local tests, formatting and reversible scoped edits                                                  | Proceed within the authorized task; preserve unrelated changes                                                                                                       |
| Yellow | Dependency installation, migration-file creation, CI/infrastructure changes, external writes                      | Inspect applicable policy, side effects and existing authorization; prepare a concrete scoped plan. External writes need actual authorization, not merely this label |
| Red    | Production writes, data deletion, force push, publication/deployment, secret rotation and external communications | Require explicit authorization for the consequential action; never infer it from a development task or ask again when that exact action is already authorized        |

A command's effects determine its class. A script called test can still be operational if it loads live credentials. Creating a migration file is distinct from applying it. This task authorizes neither production activity nor external communications.

Use environment variables and the existing deployment platform's secret facility; select an external secret manager only if a deployment requires one. Never put secret values, tokens, connection strings with credentials, CV content, private images or transcripts in policy, skills, task records, indices, ADRs or event logs. .gitignore excludes .env files, but ignore rules are not a security guarantee; inspect intended changes before sharing. Store secret names and configuration requirements, never secret values.

## Hooks and observability

Lifecycle hooks append bounded operational events under ignored artifacts/agent. Claude SessionStart, PostToolUse, PreCompact and SessionEnd map to shared events. File-change hooks invalidate context without blessing new hashes. The PreToolUse adapter requests authorization for known consequential shell patterns; it is defense in depth, not a complete shell security parser. Actual execution permissions remain the responsibility of the host and user authorization.

Run npm run agent:lifecycle -- install-git once per clone to enable .githooks; the installer refuses to overwrite a different hooksPath. Git pre-commit runs verification; post-checkout and post-merge invalidate context. No commit is required to install or test hooks. Other clients can call the explicit lifecycle command. Native callbacks must be tested in the actual client session before claiming end-to-end hook coverage.

Verification writes the latest run to artifacts/agent/verification.json and verification-events.jsonl, including commands, failures, durations, hashes and skips. Routing records selected skill, role, context bytes and an explicitly approximate token count; the MCP server records tool name, outcome and duration, never arguments or response bodies. Lifecycle logs accumulate locally; archive or remove them deliberately when no longer needed. npm run agent:metrics summarizes recorded events and the latest verification. Provider token usage and human correction counts remain null because this setup has no trusted source for them. It does not collect reasoning, transcripts, secret values or user documents.

## Skill evaluation scenarios

Evaluate instructions when they change meaning. For each scenario record selected skill, observed action, expected action and pass/fail with evidence in the task's existing verification record. Review ambiguity and authorization handling, not only frontmatter. The matrix below defines cases; its presence does not claim that model-based evaluations ran.

| Skill                 | Should trigger                            | Should not trigger            | Ambiguous/missing input                                                    | Failure case                                              | Consequential action case                                  |
| --------------------- | ----------------------------------------- | ----------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| repo-discovery        | Locate source collection and its tests    | Rewrite a known button label  | Which repository/subsystem? Inspect available context first                | Stale map: inspect source and report mismatch             | Finding deployment files does not authorize running them   |
| architecture-analysis | Assess moving matching persistence        | Correct a spelling error      | Unclear boundary goal: gather callers and constraints                      | Unsupported claim: require source evidence                | Proposed production topology does not authorize deployment |
| change-planning       | Plan a multi-module auth change           | Explain a familiar term       | Missing behavior: separate assumptions from required decisions             | Conflicting requirements: resolve before dependent edits  | Migration execution requires separate authorization        |
| implementation        | Apply a scoped authorized fix             | Review-only request           | Missing acceptance detail: inspect tests, ask only what blocks correctness | Failing regression: fix or report, do not claim done      | Never commit or publish merely to finish an edit           |
| verification          | Validate the current change               | Change product behavior       | No test target: inspect scope and use existing gates                       | Nonzero check must remain FAIL                            | Do not run live collection as a smoke test                 |
| code-review           | Review a diff for regressions             | Implement a requested feature | Missing revision: inspect current Git state and define scope               | No concrete evidence: do not invent findings              | Review does not authorize merge or force push              |
| security-review       | Review changed auth/private-data handling | Adjust visual spacing         | Unclear access expectations: inspect roles and contracts                   | Unverified concern: label it and identify evidence needed | Do not probe production or expose secrets                  |
| release               | Prepare an explicitly requested release   | Ordinary local bug fix        | Missing target: prepare evidence, resolve target before external action    | Failed gate blocks a ready claim                          | Publication/deployment needs explicit authorization        |

Use an isolated fixture or checkout for behavioral evaluations when needed. Do not give an evaluator the intended answer. Use only authorized delegation, avoid external side effects and retain concise outcomes rather than full conversations. npm run agent:eval executes deterministic routing fixtures covering all eight selected skills, explanation-only requests, ambiguity, unsafe actions and missing input. It records fixture/router/skill hashes and observed routes, and exits nonzero on mismatches. Vitest exercises failure handling, claims, protocol boundaries and freshness. These checks do not prove model instruction-following: a model-based assessment must name the actual model, observations and evaluated snapshot separately. No model agent is launched automatically by verification.

## Restart and pre-edit conflict checks

A substantial task must be recoverable from its goal, baseline commit, owner, workspace, plan, completed/remaining steps, current Git changes and recorded verification. Preserve state when interrupted; do not infer completion from a stopped session. Save concise findings and an optional handoff when another owner will continue. Conversation history is not the recovery mechanism.

Run `npm run agent:changed-files -- --resume <id>`. This read-only extension loads validated task state, compares baseline HEAD and recorded branch/worktree with actual Git, reports current changed paths and source/diff hashes, and runs context checks including recorded ownership conflicts. It emits JSON and returns nonzero for a baseline/workspace mismatch, missing workspace metadata or invalid context. It never edits task state, refreshes indices, starts an agent or restores files. Historical tasks without workspace metadata require manual checkout confirmation; their records are not silently upgraded.

A zero exit only means these recorded checks passed. Before editing, inspect git status, the actual diff for intended files, recorded claims, and the current worktree owner. Compare with initial_changes, but do not assume that an already-modified file belongs to this task or that an unchanged HEAD proves identical content. Preserve user edits. Coordinate or serialize overlapping work; use a deliberately based worktree for independent work. After a crash, interrupted tests have no passing result. Re-read changed sources and rerun checks before reusing evidence.

A HEAD mismatch may be an expected rebase or later commit, not corruption. Investigate it, record the reviewed change of baseline if appropriate and update state deliberately. A stale index is a reason to inspect source before refreshing it, not a reason to restore old source. Do not copy remembered file contents over the current checkout.

## Applying the workflow to Jobradar

**Authentication feature:** Jobradar currently uses opaque database sessions, not a documented rotating access/refresh-token pair. If asked to introduce rotation, inspect src/lib/auth.ts, src/app/api/auth/route.ts, the session migrations and auth/security tests. Load system/security context and relevant implementation/security-review/verification skills. Plan compatibility, token storage, reuse handling and concurrent-session behavior before changing the contract. Record a consequential accepted decision; do not invent an existing auth ADR. Use one implementation owner, authorized isolated review where useful, and actual checks before claiming completion.

**Small login spacing fix:** inspect the actual component and style source, change the smallest relevant file and perform the required UI checks. Keep planning lightweight; do not activate database/MCP/architecture workflows based solely on a nearby keyword. The existing project policy still requires the full application test suite for code changes; this example does not introduce an affected-tests-only shortcut. Use desktop/mobile browser review when the UI change requires it.

**Production duplicate-user cleanup:** this is an example of consequential work, not an instruction to run it now. Establish the actual duplicate definition and account relationships first. Prepare a read-only affected-record query, validate counts and dependencies, and produce a concrete change/rollback plan. Obtain explicit authorization for the exact production write before executing it under controlled conditions. Record outcomes without credentials or private account contents. Do not treat matching email text or a read-only request as permission to delete accounts.

## Blueprint completion and activation

The full blueprint is adapted to this single Next.js application. Mechanisms below are implemented locally; activation and evidence limits are explicit. Alternative technologies in the generic list (Python tooling, additional secret managers, embeddings) are not mandatory installations.

| Phase / numbered items | Repository implementation                                                                                                     | Evidence or activation boundary                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Foundation 1–5         | Shared policy, thin Claude import, curated context, existing ADRs, strict task contracts                                      | Context checks and workflow regressions                                                          |
| Navigation 6–10        | Hashed repository map, Git/ripgrep, TypeScript language service, navigation, current Git change snapshots                     | Index, symbol, rename/deletion and stale-reference tests                                         |
| Skills 11–15           | Eight canonical focused workflows and checked native discovery copies                                                         | Copy drift checks, contract and routing evaluation; model adherence remains separately evaluated |
| Coordination 16–19     | Structured handoffs, atomic shared claims, native isolated Git worktrees, role/context router                                 | Conflict, recovery and role tests; delegation is explicit, never automatic                       |
| Capabilities 20–23     | Validated role registry, bounded read-only MCP, official docs and configured GitHub repository/issues, portable search plugin | Protocol and denial tests; client configuration present; private reads need external credentials |
| Reliability 24–29      | One verifier, architecture checks, provenance/hashes, context invalidation, Git/Claude hooks, authorization policy            | Local gate, lifecycle and failure tests; hosted workflow configured but needs a pushed run       |
| Optimization 30–34     | Redacted events, measured timings/context bytes, estimated tokens, routing/contract evaluations, in-memory FTS5               | Model token metrics remain unavailable; no embedding service is justified                        |

Operational commands beyond the core verification table:

| Command                                                    | Purpose                                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| npm run agent:route -- "Review authentication"             | Select role, skill, limited context and action class; never executes the task   |
| npm run agent:search -- "matching transactions"            | Search current docs and curated context using Node 24 SQLite FTS5               |
| npm run agent:symbol -- src/lib/matching-repository.ts 1 1 | Query a valid symbol's one-based source position for definitions/references     |
| npm run agent:coordinate -- status                         | Inspect cross-worktree claims; claim/release require a valid task ID            |
| npm run agent:lifecycle -- file_changed                    | Record invalidation without modifying source indices                            |
| npm run agent:mcp -- planner                               | Start the newline-delimited stdio MCP service for a bounded role                |
| npm run agent:eval                                         | Run deterministic selection/contract evaluations, with hashes and failure exits |
| npm run agent:metrics                                      | Summarize local operational evidence without fabricated provider metrics        |

The healthy-repository checklist is supported by shared policy, separate architecture, ADRs, restartable state, selectively loaded skills, role-limited tools, Git observations, isolated worktree policy and shared claims, dependency impact, source evidence, hash invalidation, deterministic checks, explicit consequential-action authorization, recorded events, and evaluated routing mechanisms. It is not a guarantee of every model's behavior or every external runtime. Consult the current task verification record for what was actually executed; no document alone establishes a passing deployment, native client session or hosted CI run.
