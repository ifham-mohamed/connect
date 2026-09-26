import { describe, expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  cpSync,
  rmSync,
  renameSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkContext,
  hash,
  gitSnapshot,
  ownershipConflicts,
} from "../.agent/scripts/context-check.mjs";
import { runChecks, verificationEvents } from "../.agent/scripts/verify.mjs";

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "jobradar-context-"));
  cpSync(".agent/schemas", join(directory, ".agent/schemas"), {
    recursive: true,
  });
  cpSync(".agent/tasks", join(directory, ".agent/tasks"), { recursive: true });
  mkdirSync(join(directory, ".agent/context"), { recursive: true });
  for (const name of ["project", "navigation"])
    writeFileSync(join(directory, `.agent/context/${name}.md`), "# Context\n");
  mkdirSync(join(directory, ".agent/index"), { recursive: true });
  writeFileSync(join(directory, "example.ts"), "export const value = 1;\n");
  writeFileSync(
    join(directory, ".agent/index/repo-map.json"),
    JSON.stringify({
      schema_version: 1,
      base_commit: "a".repeat(40),
      sources: [
        {
          path: "example.ts",
          subsystem: "test",
          sha256: hash(readFileSync(join(directory, "example.ts"))),
        },
      ],
    }),
  );
  return directory;
}

describe("agent coordination", () => {
  it("detects overlapping claims and shared independent writers while releasing completed claims", () => {
    const a = {
      task_id: "one",
      owner: "codex",
      status: "implementing",
      workspace: {
        branch: "codex/one",
        worktree: ".",
        claimed_files: ["src/lib"],
      },
    };
    const b = {
      task_id: "two",
      owner: "claude",
      status: "implementing",
      workspace: {
        branch: "codex/two",
        worktree: ".",
        claimed_files: ["src/lib/auth.ts"],
      },
    };
    expect(ownershipConflicts([a, b])).toHaveLength(2);
    expect(
      ownershipConflicts([
        a,
        { ...b, workspace: { ...b.workspace, worktree: "../separate" } },
      ]),
    ).toHaveLength(1);
    expect(ownershipConflicts([a, { ...b, status: "complete" }])).toEqual([]);
    expect(
      ownershipConflicts([
        a,
        {
          ...b,
          workspace: {
            ...b.workspace,
            worktree: "../separate",
            claimed_files: ["docs"],
          },
        },
      ]),
    ).toEqual([]);
  });
  it("records failed and skipped checks without including raw output or hidden reasoning", () => {
    const events = verificationEvents({
      started_at: "start",
      finished_at: "end",
      passed: false,
      results: [
        {
          name: "tests",
          exit_code: 7,
          duration_ms: 10,
          output: "private fixture contents",
        },
      ],
      skipped: ["build: not requested"],
    });
    expect(events).toContainEqual({
      event: "check_completed",
      check: "tests",
      exit_code: 7,
      duration_ms: 10,
    });
    expect(events).toContainEqual({
      event: "check_skipped",
      reason: "build: not requested",
    });
    expect(JSON.stringify(events)).not.toContain("private fixture");
    expect(events.at(-1)).toEqual({
      event: "verification_finished",
      at: "end",
      passed: false,
    });
  });
  it("checks links in subject-organized documentation", () => {
    const directory = fixture();
    try {
      mkdirSync(join(directory, "docs/architecture"), { recursive: true });
      mkdirSync(join(directory, "docs/api"), { recursive: true });
      writeFileSync(
        join(directory, "docs/architecture/system.md"),
        "[Contract](../api/contract.md)",
      );
      expect(checkContext(directory).join()).toContain("Broken link");
      writeFileSync(join(directory, "docs/api/contract.md"), "# Contract\n");
      expect(checkContext(directory)).toEqual([]);
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 100,
      });
    }
  });
  it("accepts valid records and rejects invalid state", () => {
    const directory = fixture();
    try {
      expect(checkContext(directory)).toEqual([]);
      writeFileSync(
        join(directory, ".agent/tasks/orchestration-upgrade/state.json"),
        "{}",
      );
      expect(
        checkContext(directory).some((error: string) =>
          error.includes("orchestration-upgrade"),
        ),
      ).toBe(true);
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 100,
      });
    }
  });
  it("invalidates changed sources and detects renamed or deleted paths", () => {
    const directory = fixture();
    try {
      writeFileSync(join(directory, "example.ts"), "changed");
      expect(checkContext(directory).join()).toContain("Stale source");
      renameSync(join(directory, "example.ts"), join(directory, "renamed.ts"));
      expect(checkContext(directory).join()).toContain("Missing source");
      rmSync(join(directory, "renamed.ts"));
      expect(checkContext(directory).join()).toContain("Missing source");
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 100,
      });
    }
  });
  it("records current Git state including untracked file contents without relying on task memory", () => {
    const directory = fixture();
    try {
      const head = "a".repeat(40);
      const git = (...args: string[]) =>
        Buffer.from(
          args[0] === "rev-parse"
            ? head
            : args[0] === "status"
              ? "?? a path with spaces.ts\0"
              : args[0] === "ls-files"
                ? "example.ts\0a path with spaces.ts\0"
                : "diff",
        );
      const before = gitSnapshot(directory, git);
      writeFileSync(join(directory, "a path with spaces.ts"), "first");
      const changed = gitSnapshot(directory, git);
      expect(changed.head).toBe(head);
      expect(changed.status).toContain("a path with spaces.ts");
      expect(changed.source_hash).not.toBe(before.source_hash);
      writeFileSync(join(directory, "a path with spaces.ts"), "second");
      expect(gitSnapshot(directory, git).source_hash).not.toBe(
        changed.source_hash,
      );
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 100,
      });
    }
  });
  it("reports a deliberately failing child process as a failure", () => {
    const results = runChecks([
      ["deliberate failure", ["-e", "process.exit(7)"]],
    ]);
    expect(results[0].exit_code).toBe(7);
  });
});
