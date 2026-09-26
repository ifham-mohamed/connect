# Codex + Claude Code — Unified AI-Native Development Orchestration Blueprint

> **Purpose:** Build one reliable, low-token, traceable, evidence-driven orchestration layer that both **OpenAI Codex** and **Claude Code** can use without maintaining two separate project brains.

---

# 1. Core Architecture Principle

Use **one shared source of truth** inside the repository.

```text
                         USER / DEVELOPER
                               │
                               ▼
                    ┌─────────────────────┐
                    │   TASK ORCHESTRATOR │
                    │ classify → route    │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼──────────────────┐
             ▼                 ▼                  ▼
          CODEX            CLAUDE CODE       DETERMINISTIC
          runtime             runtime          scripts / CI
             │                 │                  │
             └─────────────────┼──────────────────┘
                               ▼
                  SHARED AGENTIC PROJECT LAYER
                               │
       ┌───────────────────────┼───────────────────────┐
       ▼                       ▼                       ▼
   CONTEXT                  SKILLS                 MEMORY
 AGENTS/docs            reusable workflows     decisions/state
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               ▼
                       CAPABILITY ROUTER
                  native tools / MCP / plugins
                               │
                               ▼
                   REPOSITORY + EXTERNAL SYSTEMS
                               │
                               ▼
                  VERIFY → REVIEW → RECORD
```

## Main rule

Do **not** maintain:

```text
Codex brain
+
Claude brain
```

Maintain:

```text
ONE project brain
+
Codex adapter
+
Claude adapter
```

This prevents:

- duplicated context
- contradictory instructions
- stale memory
- unnecessary token usage
- inconsistent architecture decisions
- agents modifying the same code differently

---

# 2. Recommended Repository Structure

```text
project/
│
├── AGENTS.md
├── CLAUDE.md
│
├── .agent/
│   │
│   ├── context/
│   │   ├── project.md
│   │   ├── architecture.md
│   │   ├── conventions.md
│   │   ├── glossary.md
│   │   ├── security.md
│   │   ├── dependencies.md
│   │   └── navigation.md
│   │
│   ├── memory/
│   │   ├── decisions/
│   │   │   ├── ADR-001.md
│   │   │   ├── ADR-002.md
│   │   │   └── ...
│   │   ├── lessons.md
│   │   └── known-issues.md
│   │
│   ├── tasks/
│   │   └── TASK-xxxx/
│   │       ├── brief.md
│   │       ├── plan.md
│   │       ├── state.json
│   │       ├── findings.md
│   │       ├── changed-files.json
│   │       └── verification.md
│   │
│   ├── index/
│   │   ├── repo-map.json
│   │   ├── symbols.json
│   │   ├── dependencies.json
│   │   ├── ownership.json
│   │   └── changed-files.json
│   │
│   ├── skills/
│   │   ├── repo-discovery/
│   │   │   └── SKILL.md
│   │   ├── architecture-analysis/
│   │   │   └── SKILL.md
│   │   ├── change-planning/
│   │   │   └── SKILL.md
│   │   ├── implementation/
│   │   │   └── SKILL.md
│   │   ├── verification/
│   │   │   └── SKILL.md
│   │   ├── code-review/
│   │   │   └── SKILL.md
│   │   ├── security-review/
│   │   │   └── SKILL.md
│   │   └── release/
│   │       └── SKILL.md
│   │
│   ├── schemas/
│   │   ├── task-state.schema.json
│   │   ├── handoff.schema.json
│   │   ├── repo-index.schema.json
│   │   └── provenance.schema.json
│   │
│   └── scripts/
│       ├── sync-skills.*
│       ├── update-index.*
│       ├── changed-files.*
│       ├── impact-analysis.*
│       ├── verify.*
│       └── context-health.*
│
├── .agents/
│   └── skills/
│
├── .claude/
│   ├── skills/
│   ├── agents/
│   ├── rules/
│   └── settings.json
│
├── .codex/
│   └── ...
│
├── mcp.json
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   ├── security/
│   └── operations/
│
├── scripts/
├── tests/
└── src/
```

---

# 3. `AGENTS.md` = Canonical Project Constitution

`AGENTS.md` should contain only rules that apply broadly.

```md
# Project

Purpose:
Main stack:
Primary entry points:

# Architecture

- Respect current module boundaries.
- Do not introduce infrastructure without architectural justification.
- Read `.agent/context/architecture.md` before changing service boundaries.
- Use ADRs for important architectural decisions.

# Grounding

- Never claim code behavior without inspecting the relevant source.
- Prefer repository evidence over assumptions.
- Check authoritative documentation for changing APIs or libraries.
- Distinguish verified facts from hypotheses.

# Change Policy

- Modify only files required by the task.
- Do not silently refactor unrelated code.
- Preserve unrelated working-tree changes.
- Do not overwrite original user data.

# Verification

- Run the narrowest relevant checks first.
- Expand verification when shared contracts are affected.
- Record tests and verification evidence.

# Safety

- Local reversible work can proceed.
- Destructive, production, credential, deployment, publishing, or external-write actions require approval.

# Navigation

Architecture: `.agent/context/architecture.md`
Decisions: `.agent/memory/decisions/`
Skills: `.agent/skills/`
Current work: `.agent/tasks/`
Repository index: `.agent/index/`
```

## Keep it small

Do not place:

- full architecture manuals
- every API specification
- all database schemas
- every skill procedure
- giant prompts
- historical task logs

inside `AGENTS.md`.

---

# 4. Claude Adapter

Keep `CLAUDE.md` thin.

```md
@AGENTS.md

# Claude Code Adapter

Shared project policy lives in AGENTS.md.

Use Claude-specific:
- subagents
- hooks
- path-scoped rules
- worktrees
- MCP configuration

only where they improve execution.
```

Do not duplicate project rules here.

---

# 5. Context Model

Separate **context** from **memory**.

| Type | Purpose | Example | Lifetime |
|---|---|---|---|
| Constitution | universal policy | `AGENTS.md` | long |
| Project context | how system works | `architecture.md` | long |
| Decision memory | why choices exist | ADR | long |
| Procedural memory | how to perform work | `SKILL.md` | long |
| Task memory | current task progress | `state.json` | task |
| Learned memory | reviewed recurring knowledge | `lessons.md` | curated |
| Scratch context | investigation notes | temporary file | short |
| Conversation | active interaction | session | disposable |

## Rule

```text
Important to both agents
        ↓
shared repository memory

Agent-specific convenience
        ↓
agent-local memory

Task-specific temporary information
        ↓
task state

Disposable investigation
        ↓
scratch
```

---

# 6. Token-Efficient Context Loading

Use progressive context retrieval.

```text
TASK
  ↓
read AGENTS.md
  ↓
identify relevant subsystem
  ↓
load 1–3 relevant context documents
  ↓
inspect available skill metadata
  ↓
load only selected SKILL.md
  ↓
search exact files / symbols
  ↓
read required code
  ↓
execute
```

Do not:

```text
read whole repository
read all skills
read all docs
read full conversation history
then start work
```

---

# 7. Context Router

The orchestrator should choose context by task type.

## Example

Task:

```text
Add a new authentication endpoint.
```

Load:

```text
AGENTS.md

.agent/context/
  architecture.md
  security.md
  navigation.md

.agent/skills/
  repo-discovery/SKILL.md
  implementation/SKILL.md
  verification/SKILL.md

Relevant source:
  src/auth/*
  src/api/*
  tests/auth/*
```

Do not load:

```text
frontend styling guide
analytics docs
unrelated database modules
release skill
all historical ADRs
```

---

# 8. Repository Indexing

Use four levels.

| Index | Technology | Purpose |
|---|---|---|
| File | Git + filesystem | locate files |
| Text | `ripgrep` | exact text/errors/config |
| Symbol | LSP / Tree-sitter | classes/functions/references |
| Semantic | FTS / embeddings | concepts/docs |

## Recommended baseline

```text
Git
+
ripgrep
+
language server / Tree-sitter
+
SQLite FTS5
```

Add embeddings only when semantic retrieval is genuinely useful.

---

# 9. Repository Map

Example:

```json
{
  "packages": {
    "frontend": {
      "root": "apps/web",
      "entrypoints": ["src/main.tsx"],
      "tests": "tests/",
      "depends_on": ["shared-ui", "api-client"]
    },
    "api": {
      "root": "apps/api",
      "entrypoints": ["src/server.ts"],
      "tests": "tests/",
      "depends_on": ["database", "auth"]
    }
  }
}
```

Purpose:

- fast navigation
- reduced repeated discovery
- dependency awareness
- context selection
- impact analysis

---

# 10. Git = Change Source of Truth

Use Git rather than AI-generated memory for file changes.

```bash
git status --porcelain
git diff --name-status
git diff --name-only
git diff --numstat
git diff --stat
git log --oneline -- <file>
```

Task-level change state:

```json
{
  "task": "TASK-142",
  "owner": "codex",
  "base_commit": "abc123",
  "changed": [
    {
      "path": "src/auth/session.ts",
      "reason": "Add refresh-token rotation"
    }
  ],
  "affected": [
    "src/api/auth.ts",
    "tests/auth/session.test.ts"
  ],
  "verified": false
}
```

---

# 11. Change-Impact Analyzer

A changed file should trigger impact discovery.

```text
changed file
    ↓
imports
    ↓
dependants
    ↓
shared interfaces
    ↓
API contracts
    ↓
database / schema
    ↓
configuration
    ↓
tests
    ↓
documentation
    ↓
deployment implications
```

## Useful technologies

### TypeScript

```text
TypeScript Language Server
tsc
ESLint
dependency-cruiser
Vitest / Jest
Playwright
```

### Python

```text
Pyright
Ruff
pytest
import-linter
mypy
```

---

# 12. Architecture Enforcement

Do not rely only on prompts.

Example architecture:

```text
UI
 ↓
Application
 ↓
Domain
 ↓
Infrastructure
```

Rules:

```text
Domain must not import UI.
Domain must not depend directly on infrastructure.
UI must not bypass application services.
```

Enforce using:

```text
dependency-cruiser
import-linter
custom architecture tests
CI
```

---

# 13. Skills Architecture

A skill represents a **workflow**, not a giant knowledge document.

## Good

```text
database-migration/
├── SKILL.md
├── references/
│   ├── schema-policy.md
│   └── rollback-policy.md
└── scripts/
    └── verify-migration.py
```

## Good trigger

```text
Use when creating, modifying, or reviewing a database migration.
```

## Bad trigger

```text
Use whenever anything related to backend, database, API,
models, persistence, or user data is mentioned.
```

Broad triggers cause:

- accidental skill activation
- wasted tokens
- confusing tool selection

---

# 14. Recommended Core Skills

Start small.

```text
repo-discovery
architecture-analysis
change-planning
implementation
verification
code-review
security-review
release
```

Add specialized skills only when repeated tasks justify them.

Examples:

```text
database-migration
api-contract-change
frontend-component
incident-analysis
dependency-upgrade
performance-investigation
```

---

# 15. Skills, MCP, Plugins, Hooks — Correct Boundaries

| Mechanism | Use |
|---|---|
| `AGENTS.md` | universal project policy |
| Context docs | architecture/domain knowledge |
| Skill | reusable procedure |
| Script | deterministic action |
| Hook | automatic lifecycle reaction |
| MCP | external/live data/actions |
| Plugin | portable capability package |
| Subagent | isolated workstream |
| CI | hard enforcement |

---

# 16. MCP = Capability Bus

Use MCP when information or actions are outside the repository.

Example:

```yaml
capabilities:

  github:
    transport: mcp
    permissions:
      - read_repository
      - read_issue
      - read_pr

  issue_tracker:
    transport: mcp
    permissions:
      - read_issue

  postgres:
    transport: mcp
    default: read_only

  sentry:
    transport: mcp
    permissions:
      - read_errors

  docs:
    transport: mcp
    mode: read_only
```

## Least privilege

Planner:

```text
docs
issues
repository-read
```

Implementer:

```text
repository
docs
```

Database agent:

```text
repository
database-read-only
```

Reviewer:

```text
repository
diff
tests
```

Release agent:

```text
CI
GitHub
deployment tools
```

Do not expose every MCP server to every agent.

---

# 17. Plugin Boundary

Use plugins when capabilities should be portable across projects.

```text
company-engineering-plugin/
├── plugin.json
├── skills/
│   ├── incident-response/
│   ├── release/
│   └── database-change/
├── mcp.json
├── hooks/
└── scripts/
```

Keep project-specific:

```text
architecture
ADRs
domain rules
project context
```

inside the project repository.

---

# 18. Capability Selection Hierarchy

```text
Can normal repo tools solve it?
        │
       yes
        ↓
Git / shell / search / LSP

        no
        ↓

Reusable procedure?
        │
       yes
        ↓
SKILL

        no
        ↓

Needs external/live data?
        │
       yes
        ↓
MCP

        no
        ↓

Portable reusable capability bundle?
        │
       yes
        ↓
PLUGIN
```

---

# 19. Orchestrator + Specialized Agents

Use one main orchestrator.

```text
Orchestrator
    │
    ├── Explorer
    ├── Architecture Analyst
    ├── Implementer
    ├── Verifier
    └── Reviewer
```

Do not keep all subagents running constantly.

---

# 20. Simple vs Complex Work

## Small change

```text
orchestrator
     ↓
inspect
     ↓
implement
     ↓
verify
```

## Complex change

```text
                   ┌─ explorer
                   │
orchestrator ──────┼─ architecture analyst
                   │
                   └─ dependency analyst
                          ↓
                        plan
                          ↓
                     implementer
                          ↓
                       verifier
                          ↓
                       reviewer
```

---

# 21. Codex + Claude Ownership Patterns

Do not ask both to independently implement the same feature unless deliberately comparing solutions.

## Pattern A

```text
Claude
  architecture / analysis

Codex
  implementation

Claude
  review

CI
  verification
```

## Pattern B

```text
Codex
  implementation owner

Claude
  independent reviewer

CI
  final gate
```

## Pattern C

```text
Claude
  investigation / documentation

Codex
  targeted fix

Verifier
  regression test
```

---

# 22. Standard Agent Handoff

Never pass the whole conversation.

Use a structured handoff.

```json
{
  "task": "TASK-142",
  "goal": "Add rotating refresh tokens",
  "findings": [],
  "evidence": [],
  "relevant_files": [],
  "changed_files": [],
  "constraints": [],
  "open_questions": [],
  "verification": [],
  "status": "ready_for_implementation"
}
```

Benefits:

- less token usage
- fewer hallucinations
- clearer responsibility
- reproducible work
- easier task recovery

---

# 23. Universal Task Lifecycle

```text
INTAKE
  ↓
CLASSIFY
  ↓
DISCOVER
  ↓
IMPACT ANALYSIS
  ↓
PLAN
  ↓
IMPLEMENT
  ↓
VERIFY
  ↓
REVIEW
  ↓
RECORD
  ↓
UPDATE INDEX
  ↓
CLOSE
```

---

# 24. Adaptive Planning

| Task | Process |
|---|---|
| typo / tiny config | inspect → edit → verify |
| localized feature | inspect → mini-plan → edit → tests |
| multi-module | discover → impact → plan → implement → review |
| architecture | discover → ADR → plan → staged implementation |
| external/destructive | plan → approval → action → verify |

Do not force heavyweight planning on trivial changes.

---

# 25. Persistent Task State

For substantial tasks:

```text
.agent/tasks/TASK-142/
├── brief.md
├── plan.md
├── state.json
├── findings.md
├── changed-files.json
└── verification.md
```

Example `plan.md`:

```md
# Goal

Add refresh-token rotation.

# Evidence

Relevant implementation:
- src/auth/session.ts
- src/api/auth.ts

# Expected Changes

- session token logic
- endpoint behavior
- tests

# Risks

- backward compatibility
- token reuse race
- multi-device sessions

# Verification

- unit tests
- integration tests
- authentication flow
```

---

# 26. Architecture Documentation

Use first-class architecture documentation.

```text
docs/architecture/
├── system-context.md
├── containers.md
├── components.md
├── data-flow.md
├── integrations.md
├── deployment.md
└── threat-model.md
```

Only retrieve these when relevant.

Example:

```text
CSS change
→ no need to load threat-model.md

Authentication change
→ load architecture + security + threat model
```

---

# 27. Architecture Decision Records

```text
.agent/memory/decisions/
├── ADR-001-database-choice.md
├── ADR-002-auth-strategy.md
├── ADR-003-event-bus.md
└── ...
```

ADR template:

```md
# ADR-003: Event Bus

## Status

Accepted

## Context

Why a decision is required.

## Decision

What was chosen.

## Alternatives

What was considered.

## Consequences

Tradeoffs and implications.

## Evidence

Relevant source files, metrics, benchmarks, or documentation.
```

---

# 28. Hallucination-Resistant Development

You cannot guarantee zero hallucinations.

Instead enforce evidence requirements.

```text
claim about code
    ↓
inspect source

claim about API/library
    ↓
check installed version + authoritative docs

claim about runtime
    ↓
run/test

claim about changed behavior
    ↓
diff + verification

claim about architecture
    ↓
architecture docs + source evidence
```

Agent response should reference evidence such as:

```text
src/auth/session.ts:84
package.json
migration/0037.sql
ADR-004
tests/auth/session.test.ts
```

Avoid:

```text
"The project probably uses JWT..."
```

---

# 29. Provenance

Every durable claim should know where it came from.

```json
{
  "claim": "Access tokens expire after 15 minutes",
  "source": "src/config/auth.ts",
  "symbol": "ACCESS_TOKEN_TTL",
  "verified_commit": "482ac51"
}
```

Useful metadata:

```text
source file
symbol
commit
timestamp
content hash
verification type
```

---

# 30. Context Invalidation

Never trust remembered project facts forever.

```text
remembered source hash
        │
        ▼
compare with current hash
        │
        ├── unchanged → reuse
        │
        └── changed
                ↓
             invalidate
                ↓
             re-read
                ↓
             re-index
```

This prevents stale memory from becoming false truth.

---

# 31. Parallel Work with Git Worktrees

Do not let Codex and Claude independently edit the same working directory.

```text
main repository
│
├── worktree/task-142-codex
├── worktree/task-143-claude
└── worktree/review-142
```

Task state:

```json
{
  "agent": "codex",
  "branch": "agent/task-142",
  "worktree": "../task-142-codex"
}
```

---

# 32. File Ownership During Tasks

Maintain temporary ownership.

```json
{
  "src/auth/session.ts": "TASK-142",
  "src/payments/billing.ts": "TASK-155"
}
```

If another task needs the same file:

```text
detect conflict
      ↓
serialize work
or
coordinate explicitly
```

---

# 33. Deterministic Verification

Create one project command.

```bash
./agent verify changed
```

Internally:

```text
changed files
    ↓
format
    ↓
lint
    ↓
type check
    ↓
affected tests
    ↓
architecture tests
    ↓
security checks
    ↓
build
    ↓
runtime/integration checks
```

---

# 34. Recommended Verification Technologies

```text
pre-commit
GitHub Actions
ESLint
Ruff
Pyright
mypy
tsc
pytest
Vitest
Jest
Playwright
Semgrep
CodeQL
dependency-cruiser
OpenAPI validators
migration validation
```

Use only what fits the stack.

---

# 35. Verification Evidence

Example:

```md
# Verification

## Static

- Ruff: PASS
- Pyright: PASS

## Tests

- tests/auth/test_session.py: PASS
- tests/api/test_login.py: PASS

## Build

PASS

## Manual Runtime Check

Refresh-token reuse correctly invalidates previous token.

## Remaining Risk

Multi-device session behavior requires product confirmation.
```

---

# 36. Security Action Classes

## GREEN

Normally autonomous:

```text
read files
search
run tests
format
lint
local reversible edits
```

## YELLOW

Requires policy checks or explicit plan:

```text
install dependencies
database migration creation
CI changes
infrastructure changes
external API writes
```

## RED

Require human approval:

```text
production database writes
delete data
force push
publish
deploy production
rotate secrets
send external communications
```

---

# 37. Secret Management

Use:

```text
1Password
HashiCorp Vault
AWS Secrets Manager
GitHub Actions secrets
environment variables
```

Never place secrets inside:

```text
AGENTS.md
CLAUDE.md
SKILL.md
task state
repo index
ADRs
```

---

# 38. Hooks

Useful hook events:

```text
task started
task finished
file changed
before tool call
after tool call
before commit
after verification
before external action
context compacted
worktree created
worktree removed
```

Example pipeline:

```text
file changed
    ↓
update changed-files index
    ↓
invalidate relevant symbol/index entries
    ↓
recalculate impact
    ↓
update task state
```

---

# 39. Observability

Record orchestration events, not hidden reasoning.

Example:

```json
{"event":"task_started","task":"TASK-142"}
{"event":"skill_loaded","skill":"database-migration"}
{"event":"file_changed","file":"schema.sql"}
{"event":"test_run","result":"pass"}
{"event":"review_completed","issues":2}
```

Useful metrics:

```text
task success rate
rework count
files touched
skill selection
MCP usage
failed tool calls
tests failed
context size
token usage
latency
human corrections
```

---

# 40. Agent and Skill Evals

Treat agent instructions like software.

For each skill test:

```text
should trigger
should not trigger
ambiguous request
missing information
failure condition
unsafe operation
```

Example:

```text
Skill: database-migration

Should trigger:
"Add a nullable column to users."

Should not trigger:
"Explain what a database migration is."

Ambiguous:
"Change how usernames are stored."

Unsafe:
"Apply this directly to production now."
```

---

# 41. Failure Recovery

Every task should be restartable.

Persist:

```text
goal
base commit
current owner
worktree
plan
completed steps
changed files
verification
remaining issues
```

If agent/session crashes:

```text
read task state
      ↓
validate current Git state
      ↓
recheck changed files
      ↓
continue
```

Do not depend on conversation history to resume work.

---

# 42. Conflict Detection

Before editing:

```text
git status
task ownership
changed-file index
worktree owner
```

Check:

```text
Is this file already modified?
Is it owned by another task?
Does the user's uncommitted work exist?
```

If yes:

```text
preserve
coordinate
or isolate with worktree
```

Never silently overwrite.

---

# 43. Dependency Selection Rules

Before adding a dependency:

```text
Can standard library solve it?
        ↓ no
Does project already contain equivalent library?
        ↓ no
Is dependency actively maintained?
        ↓
Check:
- version
- security
- license
- bundle/runtime impact
- ecosystem compatibility
```

Record significant new dependencies in an ADR when needed.

---

# 44. External Documentation Strategy

Use external documentation only when necessary.

Priority:

```text
repository source
   ↓
installed package/version
   ↓
official documentation
   ↓
official examples
   ↓
trusted community sources
```

Do not prefer random web results over project evidence.

---

# 45. Agent Navigation File

`.agent/context/navigation.md`

```md
# Project Navigation

## Authentication

Source:
- src/auth/

Tests:
- tests/auth/

Architecture:
- docs/architecture/authentication.md

Relevant ADRs:
- ADR-002
- ADR-011

Relevant Skills:
- implementation
- security-review
- verification

## Database

Schema:
- db/schema/

Migrations:
- db/migrations/

Tests:
- tests/database/

Relevant Skills:
- database-migration
- verification
```

This significantly reduces rediscovery tokens.

---

# 46. Real-World Example — Authentication Feature

Request:

```text
Add rotating refresh tokens.
```

## Orchestration

```text
INTAKE
  ↓
classify as security-sensitive multi-module change
  ↓
load:
  AGENTS.md
  architecture.md
  security.md
  authentication docs
  relevant ADRs
  implementation skill
  security-review skill
  verification skill
  ↓
discover:
  session code
  API endpoints
  token storage
  tests
  ↓
impact analysis
  ↓
create TASK-142 plan
  ↓
Codex implements in worktree
  ↓
Claude reviews security and architecture
  ↓
tests + lint + type check
  ↓
record ADR if architecture changed
  ↓
update index
  ↓
close task
```

---

# 47. Real-World Example — Small UI Fix

Request:

```text
Fix spacing in the login form.
```

Correct workflow:

```text
inspect component
    ↓
identify style source
    ↓
edit smallest relevant file
    ↓
run frontend lint / affected test
    ↓
finish
```

Do not:

```text
load all ADRs
start architecture agent
load database skills
query MCP servers
create huge plan
```

---

# 48. Real-World Example — Production Database Request

Request:

```text
Remove duplicate production users.
```

Correct flow:

```text
analyze
   ↓
identify destructive production action
   ↓
produce exact affected-record query
   ↓
dry-run/read-only validation
   ↓
human approval
   ↓
controlled write
   ↓
audit + verify
```

Agent must not directly execute destructive production work without approval.

---

# 49. Recommended Orchestration Stack

| Concern | Recommended Solution |
|---|---|
| Shared instructions | `AGENTS.md` |
| Claude adapter | minimal `CLAUDE.md` |
| Codex adapter | native `AGENTS.md` + config |
| Durable context | `.agent/context/` |
| Decisions | ADRs |
| Task memory | `.agent/tasks/<id>/` |
| Reusable procedures | Agent Skills |
| Code search | ripgrep |
| Symbol navigation | LSP / Tree-sitter |
| Semantic docs search | SQLite FTS / optional embeddings |
| Change source | Git |
| Impact analysis | dependency graph + LSP |
| External systems | MCP |
| Packaged capabilities | plugins |
| Automatic lifecycle work | hooks |
| Parallel execution | Git worktrees |
| Verification | tests + static checks + CI |
| Architecture enforcement | dependency rules |
| Hallucination reduction | evidence-first retrieval |
| Stale-memory prevention | provenance + hash invalidation |
| Security | approval gates |
| Monitoring | structured events |
| Quality | agent + skill evals |
| Secrets | external secret manager |

---

# 50. Final Mental Model

```text
AGENTS.md
   =
constitution

Context docs
   =
project knowledge

ADRs
   =
decision memory

Task state
   =
short-term operational memory

Skills
   =
procedures

Scripts
   =
deterministic execution

MCP
   =
external capabilities

Plugins
   =
portable capability packaging

Index
   =
navigation

Git
   =
truth + change history

Hooks
   =
automatic synchronization

Subagents
   =
isolated intelligence

Worktrees
   =
isolated execution

Tests / CI
   =
verification

Evals
   =
agent quality control

Observability
   =
system feedback

Provenance
   =
evidence origin

Context invalidation
   =
stale-memory protection
```

---

# 51. Recommended Implementation Order

## Phase 1 — Foundation

```text
1. AGENTS.md
2. CLAUDE.md adapter
3. .agent/context/
4. ADR directory
5. task-state structure
```

## Phase 2 — Navigation

```text
6. repo-map
7. ripgrep workflow
8. symbol/LSP integration
9. navigation.md
10. changed-files index
```

## Phase 3 — Skills

```text
11. repo-discovery
12. planning
13. implementation
14. verification
15. review
```

## Phase 4 — Agent Coordination

```text
16. structured handoffs
17. ownership rules
18. Git worktrees
19. Codex/Claude role routing
```

## Phase 5 — MCP / Plugins

```text
20. MCP capability registry
21. least-privilege tool exposure
22. external docs/issues/repository integrations
23. reusable plugins where justified
```

## Phase 6 — Reliability

```text
24. deterministic verify command
25. architecture tests
26. provenance
27. context invalidation
28. hooks
29. security gates
```

## Phase 7 — Optimization

```text
30. observability
31. token/context metrics
32. skill evals
33. routing evals
34. semantic indexing only if useful
```

---

# 52. Definition of a Healthy AI-Native Repository

A healthy orchestration setup should satisfy all of these:

```text
✓ Codex and Claude read the same project rules.
✓ Architecture knowledge is separate from agent instructions.
✓ Important decisions are stored as ADRs.
✓ Current task state survives session loss.
✓ Skills are small and selectively loaded.
✓ MCP tools use least privilege.
✓ Git remains the authority for changes.
✓ Parallel agents use isolated worktrees.
✓ File changes are indexed and attributable.
✓ Impact analysis identifies affected dependencies and tests.
✓ Assertions about code are evidence-backed.
✓ Stale memory is invalidated.
✓ Verification is deterministic.
✓ Destructive actions require explicit approval.
✓ Agent activity is observable.
✓ Skills and routing are evaluated.
✓ The repository—not conversation history—is the durable brain.
```

---

# Final Architecture Rule

> **Use AI for reasoning, exploration, planning, implementation, and review. Use deterministic systems for truth, state, permissions, indexing, testing, and enforcement.**

That separation is the foundation of reliable Codex + Claude Code orchestration.
