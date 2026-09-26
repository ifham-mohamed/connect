# Codex adapter

Project policy comes from AGENTS.md. `.agent/skills` is the only maintained
skill source; `.agents/skills` is its generated Codex discovery adapter. Claude
has a separate generated adapter under `.claude/skills` because each tool
discovers skills from its own directory. Never edit either generated copy.
Run `npm run agent:sync-skills` to check both adapters or add `-- --write` only
after reviewing the canonical changes. The project config registers the local
read-only MCP server with documentation-only implementer capabilities. Start
Codex at the repository root; project trust and a new session may be needed.
It does not override global model or permission settings. See [workflow](../docs/operations/agent-workflow.md).
