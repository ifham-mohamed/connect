---
name: release
description: Prepare release evidence for an explicitly requested Jobradar release; does not authorize deployment.
---

# release

Read operations authority and task scope. Confirm current Git state and run the application verification gate. Identify migrations and operational steps separately; do not execute them as verification. Prepare exact release artifacts and rollback considerations. Commit, publish or deploy only when the user has authorized those actions.

Shared policy: read AGENTS.md from the repository root. Commands and evidence: docs/operations/agent-workflow.md.
