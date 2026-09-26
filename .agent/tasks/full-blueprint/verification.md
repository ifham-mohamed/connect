# Verification

## Automated checks

- PASS — `npm run agent:verify -- --application`
- PASS — context, source hashes, generated skill copies and repository map
- PASS — Prettier check, architecture boundaries, ESLint and TypeScript
- PASS — 22 Vitest files, 152 tests
- PASS — Next.js production build
- PASS — deterministic routing evaluation: 22/22 cases
- PASS — read-only MCP, capability denial, lifecycle authorization, claims and plugin validation tests

## Evidence boundaries

The hosted workflow is configured but was not run remotely. Native Claude callbacks require a new trusted client session. Deterministic routing and skill-contract checks do not measure model instruction-following, and provider token usage is unavailable. No live database, source collection, JEV evaluation, deployment or commit-time production action was run.
