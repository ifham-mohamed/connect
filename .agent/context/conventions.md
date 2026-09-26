# Conventions

Use the existing TypeScript, App Router and npm conventions. Inspect adjacent source and tests first. Read installed Next guidance before changing framework boundaries. Preserve generated Next instructions.

Keep changes scoped; preserve API response contracts and transaction ownership. Use Vitest and PGlite already installed. PGlite is not production PostgreSQL certification.

Run `agent:verify` for scripts or application changes, `agent:verify -- --application` for the build gate, and `agent:verify -- --docs` for documentation alone. Checks never rewrite sources. Review generated index changes before accepting refreshed hashes. See [workflow](../../docs/operations/agent-workflow.md).
