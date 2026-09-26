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
