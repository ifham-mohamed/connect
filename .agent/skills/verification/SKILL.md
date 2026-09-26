---
name: verification
description: Verify Jobradar changes and record source-bound evidence without live operations.
---

# verification

Run agent:context-check and focused regression tests first. Use agent:verify for code or script changes; --application adds production build. Use --docs only for documentation changes. Never run live workers, collection, migrations, rematching or live model evaluation as a check. Record command, exit code, source/diff hashes and skip reasons. A skipped check is not a pass.

Shared policy: read AGENTS.md from the repository root. Commands and evidence: docs/operations/agent-workflow.md.
