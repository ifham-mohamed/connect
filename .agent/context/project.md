# Jobradar project

Single npm application, Node >=24, Next App Router, React, TypeScript, PostgreSQL,
Vitest and PGlite. Exact versions belong to package-lock.json.

## Authorities

- [Architecture](../../docs/architecture/system.md)
- [Operations](../../docs/operations/runbook.md)
- [Security review](../../docs/security/security-audit.md)
- [JEV decision](../../docs/architecture/adr-001-jev-only-decision-layer.md)
- [Navigation](navigation.md)

Paths above are relative to this file. Source and current checks take precedence
over historical environment observations in operations documents.

Entry points: src/app (pages and HTTP), src/components (presentation), src/lib
(application operations), scripts (operational commands), db (SQL migrations).
Keep developer orchestration in .agent; it does not run inside the application.

No schema or deployment changes are required for the orchestration upgrade.
Existing skills/ files are reference assets, not generated agent skills.

Start with the whole-platform architecture before JEV-specific documents. The core is accounts, onboarding, collection, deterministic matching, scoped reads and personal tracking; JEV is an optional extension. Development-agent orchestration is separate from both.
