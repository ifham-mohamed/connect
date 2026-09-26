# Claude adapter

CLAUDE.md imports AGENTS.md. `.agent/skills` is the only maintained skill
source; `.claude/skills` is a generated Claude discovery adapter and mirrors it
byte-for-byte. `.agents/skills` is the corresponding Codex adapter. Never edit
either generated copy. Run `npm run agent:sync-skills` to check both adapters
or add `-- --write` only after reviewing canonical changes. The root `.mcp.json`
registers documentation-only read access. `settings.json` connects lifecycle
and consequential-command checks to the shared hook script. Start Claude at
the repository root and confirm native hook activation in a new trusted
session. No credentials, application model providers or automatic subagents
are configured. See [workflow](../docs/operations/agent-workflow.md).
