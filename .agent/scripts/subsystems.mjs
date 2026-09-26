// Reviewed navigation relationships, not an invented package architecture.
export const subsystems = {
  dashboard: {
    roots: ["src/components"],
    entrypoints: ["src/components/dashboard.tsx"],
    tests: ["tests/dashboard-views.test.ts"],
    docs: ["docs/architecture/system.md"],
    depends_on: ["actions"],
    review: [
      "Navigation, client/server boundary, demo/live separation and accessibility",
    ],
  },
  actions: {
    roots: ["src/app/api/actions", "src/lib/actions"],
    entrypoints: ["src/app/api/actions/route.ts"],
    tests: ["tests/actions.test.ts"],
    docs: ["docs/security/security-audit.md"],
    depends_on: ["matching", "collection", "database"],
    review: [
      "All action names, validation, status/body contracts, owner/member access and audit events",
    ],
  },
  matching: {
    roots: ["src/lib/matching.ts", "src/lib/matching-repository.ts"],
    entrypoints: ["src/lib/matching-repository.ts"],
    tests: ["tests/matching-repository.test.ts", "tests/database.test.ts"],
    docs: ["docs/architecture/system.md"],
    depends_on: ["database"],
    review: [
      "Caller-owned transactions, deterministic/assisted modes, scoped SQL and empty inputs",
    ],
  },
  collection: {
    roots: ["src/lib/sync.ts", "src/lib/connectors.ts"],
    entrypoints: ["src/lib/sync.ts"],
    tests: ["tests/sync.test.ts"],
    docs: ["docs/api/source-integrations.md"],
    depends_on: ["matching", "database"],
    review: [
      "Source leases, allowlisted connectors and rollback; never run collection as verification",
    ],
  },
  database: {
    roots: ["db", "src/lib/db.ts", "scripts/migrate.ts"],
    entrypoints: ["src/lib/db.ts", "scripts/migrate.ts"],
    tests: ["tests/database.test.ts", "tests/database-config.test.ts"],
    docs: ["docs/operations/runbook.md"],
    depends_on: [],
    review: [
      "Explicit migration registration, shared schema compatibility and separate deployment review",
    ],
  },
  intelligence: {
    roots: ["src/lib/jev", "src/lib/intelligence", "src/app/api/intelligence"],
    entrypoints: ["src/lib/intelligence/worker.ts"],
    tests: ["tests/jev.test.ts", "tests/intelligence.test.ts"],
    docs: ["docs/api/jev-decision-contract.md"],
    depends_on: ["matching", "database"],
    review: [
      "JEV-only policy, judgment contracts and offline evaluation; no live calls",
    ],
  },
  workflow: {
    roots: [".agent", ".agents", ".claude", ".codex", "AGENTS.md", "CLAUDE.md"],
    entrypoints: [".agent/scripts/verify.mjs"],
    tests: [
      "tests/agent-index.test.ts",
      "tests/agent-workflow.test.ts",
      "tests/architecture.test.ts",
    ],
    docs: ["docs/operations/agent-workflow.md"],
    depends_on: [],
    review: [
      "Read-only checks, source-bound evidence and canonical skill adapters",
    ],
  },
};

export const within = (path, parent) =>
  path === parent || path.startsWith(parent + "/");
