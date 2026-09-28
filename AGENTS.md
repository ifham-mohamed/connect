<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Jobradar project guidance

Jobradar is one Next.js App Router / TypeScript application with PostgreSQL,
source collection, personal job tracking, and optional JEV judgments.

- Read `.agent/context/project.md` and only the relevant entries in
  `.agent/context/navigation.md` before substantial work.
- For engineering requests, use
  `.agent/skills/engineering-task-refiner/SKILL.md` to ground the request in
  repository evidence and choose the smallest suitable task pattern. Keep clear,
  small requests lightweight. When asked to do work, refine and continue within
  that scope; return only a refined prompt when prompt refinement is the request.
  Ask about unresolved product decisions before making dependent changes.
- Existing architecture, security, operations, and JEV documents remain the
  authorities. JEV is the only application model service; development agents
  are not application providers.
- Preserve API contracts, owner/member isolation, caller-owned transactions,
  deterministic matching, and browser/server boundaries unless explicitly tasked
  to change them. Do not introduce infrastructure merely to match a blueprint.
- Inspect source before asserting behavior. Record executed checks separately
  from proposals and historical observations.
- Preserve unrelated working-tree changes, reference assets, and user data.
  Never commit, deploy, migrate a live database, or run live collection merely
  as part of verification.
- Do not put credentials, CV contents, private images, session material, or
  conversation transcripts in context, indices, or task records.
- Use `npm run agent:verify -- --docs` for documentation-only changes,
  `npm run agent:verify` for application checks, and
  `npm run agent:verify -- --application` to also build.
- Substantial tasks keep a brief, plan, state, and verification record under
  `.agent/tasks/<id>/`. On resumption inspect current Git changes and HEAD;
  task records do not override Git. Use one implementation owner per task.
- `npm run agent:context-check` reports invalid task records, missing paths,
  and stale indexed source hashes. Update hashes only after reviewing changes.

- Before changing service boundaries, read `.agent/context/architecture.md`.
  Keep consequential decisions in `.agent/memory/decisions/` and reusable
  procedures in `.agent/skills/`. Load only context relevant to the task.
- Edit shared skills in `.agent/skills/`; discovery copies under `.agents/skills/`
  and `.claude/skills/` are generated. See `docs/operations/agent-workflow.md`.

- Independent writers use separate Git worktrees; coordinate overlapping file
  claims and preserve uncommitted changes. See the shared workflow for optional
  workspace metadata and the limits of advisory ownership checks.

# Behavioral guidelines

These guidelines bias toward caution over speed. Use judgment for trivial
tasks.

## Think before coding

- State assumptions explicitly. If uncertain, ask before implementing.
- Surface multiple interpretations and tradeoffs instead of choosing silently.
- Prefer a simpler approach when it solves the request; push back on needless
  complexity.
- If the request is unclear, name the ambiguity and ask before making a
  consequential change.

## Simplicity first

- Implement only what the request needs.
- Do not add speculative features, single-use abstractions, or unnecessary
  configurability.
- Do not add handling for impossible scenarios.
- If an implementation is much larger than the problem requires, simplify it.

## Surgical changes

- Change only what the task requires and match the existing style.
- Do not refactor adjacent code or remove unrelated dead code.
- Remove imports, variables, or functions that become unused because of the
  current change.
- Every changed line should trace directly to the requested outcome.

## Goal-driven execution

- Define success as an observable check before implementation.
- For validation work, add or identify a failing case first, then make it pass.
- For refactoring, verify behavior before and after the change.
- For multi-step work, keep a short plan with each step's verification check.
