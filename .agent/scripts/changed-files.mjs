import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { root, checkContext, gitSnapshot } from "./context-check.mjs";
import { taskSchema } from "./contracts.mjs";

export function parseStatus(value) {
  const entries = value.split("\0");
  const changes = [];
  for (let i = 0; i < entries.length; i++) {
    if (!entries[i]) continue;
    const status = entries[i].slice(0, 2);
    const path = entries[i].slice(3);
    const previous_path = /[RC]/.test(status) ? entries[++i] : undefined;
    changes.push({ status, path, ...(previous_path ? { previous_path } : {}) });
  }
  return changes;
}

export function changedFiles(directory = root) {
  const git = (...args) =>
    execFileSync("git", args, { cwd: directory }).toString();
  return {
    schema_version: 1,
    base_commit: git("rev-parse", "HEAD").trim(),
    meaning: "Current Git observation; does not attribute changes to an agent",
    changes: parseStatus(
      git("status", "--porcelain=v1", "--untracked-files=all", "-z"),
    ),
  };
}

export function recoveryAssessment(task, current, workspace, directory = root) {
  const issues = [];
  if (task.base_commit !== current.head)
    issues.push(
      "HEAD differs from the task baseline; inspect intervening changes before continuing",
    );
  if (task.workspace) {
    if (task.workspace.branch !== workspace.branch)
      issues.push("Branch differs from the recorded workspace");
    const normalized = (path) =>
      resolve(directory, path).replaceAll("\\", "/").toLowerCase();
    if (normalized(task.workspace.worktree) !== normalized(workspace.worktree))
      issues.push("Worktree differs from the recorded workspace");
  } else
    issues.push(
      "No recorded workspace; establish the current checkout and owner before editing",
    );
  return {
    task: task.task_id,
    owner: task.owner,
    goal: task.goal,
    status: task.status,
    completed: task.completed,
    remaining: task.remaining,
    previous_verification: task.verification,
    issues,
    verified: false,
    instruction:
      "Inspect current diff and user changes, coordinate ownership, then rerun applicable checks. This report does not resume work or authorize overwrites.",
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  const observation = changedFiles();
  if (!args.length) console.log(JSON.stringify(observation, null, 2));
  else {
    if (
      args.length !== 2 ||
      !["--task", "--resume"].includes(args[0]) ||
      !/^[a-zA-Z0-9_-]+$/.test(args[1])
    )
      throw new Error("Use no arguments, --task <id>, or --resume <id>");
    const task = taskSchema.parse(
      JSON.parse(
        readFileSync(
          resolve(root, ".agent/tasks", args[1], "state.json"),
          "utf8",
        ),
      ),
    );
    if (task.task_id !== args[1])
      throw new Error("Task ID differs from directory");
    if (args[0] === "--resume") {
      const git = (...args) =>
        execFileSync("git", args, { cwd: root }).toString().trim();
      const snapshot = gitSnapshot(root);
      const workspace = {
        branch: git("branch", "--show-current") || "detached",
        worktree: git("rev-parse", "--show-toplevel"),
      };
      const assessment = recoveryAssessment(task, snapshot, workspace);
      const contextErrors = checkContext();
      console.log(
        JSON.stringify(
          {
            ...assessment,
            current: { ...observation, ...snapshot, workspace },
            initial_changes: task.baseline_changes,
            context_errors: contextErrors,
            plan: `.agent/tasks/${task.task_id}/plan.md`,
          },
          null,
          2,
        ),
      );
      process.exitCode =
        assessment.issues.length || contextErrors.length ? 1 : 0;
    } else
      console.log(
        JSON.stringify(
          {
            ...observation,
            task: task.task_id,
            owner: task.owner,
            task_base_commit: task.base_commit,
            goal: task.goal,
            intended_files: task.intended_files,
            initial_changes: task.baseline_changes,
            verified: false,
            attribution:
              "Observed changes may include pre-existing or other authors' edits. Record reviewed reasons in task findings; never infer authorship from status.",
          },
          null,
          2,
        ),
      );
  }
}
