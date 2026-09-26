import { describe, it, expect } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseStatus,
  recoveryAssessment,
} from "../.agent/scripts/changed-files.mjs";
import {
  impactedPaths,
  impactReport,
} from "../.agent/scripts/impact-analysis.mjs";
import { buildIndex } from "../.agent/scripts/update-index.mjs";
import { syncSkills } from "../.agent/scripts/sync-skills.mjs";

describe("shared navigation tools", () => {
  it("reports recovery baseline and workspace drift without claiming verification", () => {
    const task = {
      task_id: "resume",
      owner: "codex",
      goal: "Continue safely",
      status: "implementing",
      completed: [],
      remaining: ["test"],
      verification: ["historical pass"],
      base_commit: "a".repeat(40),
      workspace: { branch: "codex/resume", worktree: ".", claimed_files: [] },
    };
    const current = { head: task.base_commit };
    const workspace = { branch: "codex/resume", worktree: "." };
    expect(recoveryAssessment(task, current, workspace).issues).toEqual([]);
    expect(recoveryAssessment(task, current, workspace).verified).toBe(false);
    expect(
      recoveryAssessment(
        task,
        { head: "b".repeat(40) },
        { branch: "other", worktree: "../other" },
      ).issues,
    ).toHaveLength(3);
    expect(
      recoveryAssessment({ ...task, workspace: undefined }, current, workspace)
        .issues,
    ).toHaveLength(1);
  });
  it("surfaces SQL, configuration and contract review without claiming verification", () => {
    const report = impactReport(
      ["db/new.sql", "package.json", "unknown.txt"],
      [{ from: "src/app/api/actions/route.ts", to: "db/new.sql" }],
    );
    expect(report.schema).toContain("db/new.sql");
    expect(report.configuration).toContain("package.json");
    expect(report.api_contracts).toContain("src/app/api/actions/route.ts");
    expect(report.tests).toContain("tests/actions.test.ts");
    expect(report.documentation).toContain("docs/operations/runbook.md");
    expect(report.unmapped).toContain("unknown.txt");
    expect(report.verified).toBe(false);
    const sqlOnly = impactReport(["db/new.sql"], []);
    expect(sqlOnly.conceptual_dependants).toContain("actions");
    expect(sqlOnly.tests).toContain("tests/actions.test.ts");
  });
  it("preserves spaces, deletes and both rename paths in Git status", () => {
    expect(
      parseStatus(
        "R  new name.ts\0old name.ts\0 D removed.ts\0?? new file.ts\0",
      ),
    ).toEqual([
      { status: "R ", path: "new name.ts", previous_path: "old name.ts" },
      { status: " D", path: "removed.ts" },
      { status: "??", path: "new file.ts" },
    ]);
  });
  it("finds transitive importers despite cycles and unresolved imports", () => {
    expect(
      impactedPaths(
        ["a"],
        [
          { from: "b", to: "a" },
          { from: "c", to: "b" },
          { from: "a", to: "c" },
          { from: "external", to: null },
        ],
      ),
    ).toEqual(["a", "b", "c"]);
  });
  it("indexes named exports, alias imports and hashes without executing source", () => {
    const directory = mkdtempSync(join(tmpdir(), "jobradar-index-"));
    try {
      mkdirSync(join(directory, "src"));
      writeFileSync(
        join(directory, "package.json"),
        '{"dependencies":{"example":"^1"}}',
      );
      writeFileSync(
        join(directory, "tsconfig.json"),
        '{"compilerOptions":{"moduleResolution":"bundler","paths":{"@/*":["./src/*"]}}}',
      );
      writeFileSync(
        join(directory, "src/a.ts"),
        "export const value = 1; throw new Error('never execute');",
      );
      writeFileSync(
        join(directory, "src/b.ts"),
        'import { value } from "@/a"; export function result() { return value; }',
      );
      const git = (...args: string[]) =>
        args[0] === "rev-parse"
          ? "a".repeat(40)
          : "src/a.ts\0src/b.ts\0package.json\0tsconfig.json\0";
      const index = buildIndex(directory, git);
      expect(index["dependencies.json"].imports).toContainEqual({
        from: "src/b.ts",
        specifier: "@/a",
        to: "src/a.ts",
      });
      expect(index["symbols.json"].symbols).toContainEqual({
        path: "src/b.ts",
        name: "result",
        line: 1,
      });
      writeFileSync(join(directory, "src/a.ts"), "export const value = 2;");
      expect(
        buildIndex(directory, git)["symbols.json"].provenance.source_hash,
      ).not.toBe(index["symbols.json"].provenance.source_hash);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it("detects adapter drift without writing, synchronizes explicitly and preserves unknown skills", () => {
    const directory = mkdtempSync(join(tmpdir(), "jobradar-skills-"));
    try {
      mkdirSync(join(directory, ".agent/skills/example"), { recursive: true });
      const body =
        "---\nname: example\ndescription: An example workflow\n---\n";
      writeFileSync(join(directory, ".agent/skills/example/SKILL.md"), body);
      expect(syncSkills(directory)).toHaveLength(2);
      expect(syncSkills(directory, true)).toEqual([]);
      const copy = join(directory, ".agents/skills/example/SKILL.md");
      writeFileSync(copy, "local change");
      expect(syncSkills(directory)).toHaveLength(1);
      expect(readFileSync(copy, "utf8")).toBe("local change");
      mkdirSync(join(directory, ".agents/skills/unmanaged"));
      expect(syncSkills(directory, true).join()).toContain("Unmanaged skill");
      expect(readFileSync(copy, "utf8")).toBe(body);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
