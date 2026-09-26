import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  rmdirSync,
  existsSync,
  realpathSync,
} from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import {
  root,
  ownershipConflicts,
  gitSnapshot,
  safePath,
} from "./context-check.mjs";
import { taskSchema } from "./contracts.mjs";

export function changeClaims(registry, task, action) {
  const entries = registry.filter((entry) => entry.task_id !== task.task_id);
  const previous = registry.find((entry) => entry.task_id === task.task_id);
  if (
    previous &&
    (previous.owner !== task.owner ||
      previous.workspace.worktree !== task.workspace.worktree)
  )
    throw new Error("Task is already claimed by a different owner or checkout");
  if (action === "release") return entries;
  if (action !== "claim") throw new Error("Use claim or release");
  const errors = ownershipConflicts([...entries, task]);
  if (errors.length) throw new Error(errors.join("\n"));
  return [...entries, task];
}

export function coordinate(action, id, directory = root) {
  if (!["claim", "release", "status"].includes(action))
    throw new Error("Use status, claim <task>, or release <task>");
  const git = (...args) =>
    execFileSync("git", args, { cwd: directory }).toString().trim();
  const common = resolve(directory, git("rev-parse", "--git-common-dir"));
  const storage = resolve(common, "jobradar-agents");
  mkdirSync(storage, { recursive: true });
  const file = resolve(storage, "claims.json");
  const read = () =>
    existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
  if (action === "status") return read();
  if (!/^[a-zA-Z0-9_-]+$/.test(id ?? "")) throw new Error("Invalid task ID");
  const state = taskSchema.parse(
    JSON.parse(
      readFileSync(
        resolve(directory, ".agent/tasks", id, "state.json"),
        "utf8",
      ),
    ),
  );
  if (state.task_id !== id || !state.workspace)
    throw new Error("Task ID and workspace metadata required");
  for (const path of state.workspace.claimed_files) safePath(directory, path);
  const worktree = realpathSync(directory).replaceAll("\\", "/");
  if (
    realpathSync(resolve(directory, state.workspace.worktree))
      .replaceAll("\\", "/")
      .toLowerCase() !== worktree.toLowerCase()
  )
    throw new Error("Claim must run in its recorded checkout");
  const branch = git("branch", "--show-current") || "detached";
  if (state.workspace.branch !== branch)
    throw new Error("Recorded branch differs from Git");
  if (action === "claim" && state.status === "complete")
    throw new Error("Completed task cannot claim files");
  const lock = resolve(storage, "update.lock");
  try {
    mkdirSync(lock);
  } catch {
    throw new Error(
      "Coordination update locked; inspect stale lock manually after a crash",
    );
  }
  try {
    const task = {
      ...state,
      workspace: { ...state.workspace, worktree },
      checkpoint: gitSnapshot(directory),
    };
    const updated = changeClaims(read(), task, action);
    const temp = resolve(storage, `claims-${process.pid}.tmp`);
    writeFileSync(temp, JSON.stringify(updated, null, 2) + "\n");
    renameSync(temp, file);
    return {
      action,
      task: id,
      branch,
      worktree,
      source_hash: task.checkpoint.source_hash,
      attribution:
        "Declared task owner and checkpoint; not proof of authorship of unrelated edits",
    };
  } finally {
    rmdirSync(lock);
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(
    JSON.stringify(
      coordinate(process.argv[2] ?? "status", process.argv[3]),
      null,
      2,
    ),
  );
