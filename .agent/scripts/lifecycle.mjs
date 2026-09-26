import {
  mkdirSync,
  appendFileSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { root } from "./context-check.mjs";

export function hookDecision(input) {
  if (input.hook_event_name !== "PreToolUse") return null;
  if (["Bash", "PowerShell", "Shell"].includes(input.tool_name)) {
    const command = String(input.tool_input?.command ?? "");
    // Defense in depth for known operational commands, not a shell sandbox.
    if (
      /git\s+push.*(?:--force|\s-f\b)|npm\s+(?:run\s+)?(?:publish|db:migrate|sync|jev:backfill)|\b(?:vercel|wrangler)\s+deploy|\bDROP\s+(?:TABLE|DATABASE)\b|\bRemove-Item\b|\brm\s+-[^\s]*r/i.test(
        command,
      )
    )
      return {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "ask",
          permissionDecisionReason:
            "Operational or destructive command requires explicit user authorization under repository policy",
        },
      };
  }
  return null;
}

export function lifecycle(event, directory = root) {
  if (
    ![
      "task_started",
      "file_changed",
      "context_compacted",
      "task_finished",
      "worktree_created",
      "worktree_removed",
    ].includes(event)
  )
    throw new Error("Unknown lifecycle event");
  const target = resolve(directory, "artifacts/agent");
  mkdirSync(target, { recursive: true });
  appendFileSync(
    resolve(target, "lifecycle.jsonl"),
    JSON.stringify({ event, at: new Date().toISOString() }) + "\n",
  );
  if (event === "file_changed")
    writeFileSync(
      resolve(target, "context-invalidated.json"),
      JSON.stringify({
        event,
        requires:
          "Review changes, impact, explicit index refresh and verification",
      }) + "\n",
    );
}

export function recordActivity(event, fields, directory = root) {
  if (!["route_selected", "capability_called"].includes(event))
    throw new Error("Unknown activity event");
  const selected = {};
  for (const key of [
    "skill",
    "role",
    "tool",
    "passed",
    "duration_ms",
    "context_bytes",
    "estimated_tokens",
  ])
    if (fields[key] !== undefined) selected[key] = fields[key];
  const target = resolve(directory, "artifacts/agent");
  mkdirSync(target, { recursive: true });
  appendFileSync(
    resolve(target, "lifecycle.jsonl"),
    JSON.stringify({ event, at: new Date().toISOString(), ...selected }) + "\n",
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const mode = process.argv[2];
  if (mode === "install-git") {
    let previous = "";
    try {
      previous = execFileSync(
        "git",
        ["config", "--local", "--get", "core.hooksPath"],
        { cwd: root, stdio: ["ignore", "pipe", "ignore"] },
      )
        .toString()
        .trim();
    } catch {
      /* Unset is expected. */
    }
    if (previous && previous !== ".githooks")
      throw new Error(
        "An existing hooksPath is configured; merge manually instead of overwriting",
      );
    execFileSync("git", ["config", "--local", "core.hooksPath", ".githooks"], {
      cwd: root,
    });
    console.log(
      "Repository Git hooks enabled; existing uncommitted work preserved.",
    );
  } else if (mode === "claude") {
    const raw = readFileSync(0, "utf8");
    if (raw.length > 1000000) throw new Error("Hook input exceeds limit");
    const input = JSON.parse(raw);
    const decision = hookDecision(input);
    if (decision) console.log(JSON.stringify(decision));
    const mapping = {
      SessionStart: "task_started",
      PostToolUse: "file_changed",
      PreCompact: "context_compacted",
      SessionEnd: "task_finished",
    };
    if (mapping[input.hook_event_name])
      lifecycle(mapping[input.hook_event_name]);
  } else lifecycle(mode);
}
