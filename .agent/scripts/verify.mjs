import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, execFileSync } from "node:child_process";
import { root, gitSnapshot } from "./context-check.mjs";

export function runChecks(checks, run = spawnSync) {
  return checks.map(([name, args]) => {
    const started = Date.now();
    const result = run(process.execPath, args, {
      cwd: root,
      stdio: "inherit",
      shell: false,
    });
    return {
      name,
      command: [process.execPath, ...args],
      exit_code: result.status ?? 1,
      duration_ms: Date.now() - started,
      error: result.error?.message,
    };
  });
}

export function verificationEvents(report) {
  return [
    { event: "verification_started", at: report.started_at },
    ...report.results.map((result) => ({
      event: "check_completed",
      check: result.name,
      exit_code: result.exit_code,
      duration_ms: result.duration_ms,
    })),
    ...report.skipped.map((reason) => ({ event: "check_skipped", reason })),
    {
      event: "verification_finished",
      at: report.finished_at,
      passed: report.passed,
    },
  ];
}

export function verify(args = process.argv.slice(2)) {
  if (
    args.some((arg) => !["--docs", "--application"].includes(arg)) ||
    (args.includes("--docs") && args.includes("--application"))
  )
    throw new Error("Use --docs, --application, or no arguments");
  const docs = args.includes("--docs");
  const application = args.includes("--application");
  const startedAt = new Date().toISOString();
  const before = gitSnapshot(root);
  const gitFiles = (...args) =>
    execFileSync("git", args, { cwd: root })
      .toString()
      .split("\0")
      .filter(Boolean);
  const changedFiles = [
    ...new Set([
      ...gitFiles("diff", "--name-only", "--diff-filter=ACMR", "-z", "HEAD"),
      ...gitFiles("ls-files", "--others", "--exclude-standard", "-z"),
    ]),
  ].filter(
    (path) =>
      existsSync(resolve(root, path)) &&
      /\.(?:[cm]?[jt]sx?|json|md|css|ya?ml)$/.test(path) &&
      // User-supplied source material is deliberately preserved verbatim.
      path !==
        "docs/architecture/codex_claude_unified_orchestration_blueprint.md" &&
      path !== "next-env.d.ts" &&
      (!docs || path.endsWith(".md") || path.startsWith(".agent/")),
  );
  const checks = [
    ["context", [".agent/scripts/context-health.mjs"]],
    [
      "format",
      [
        "node_modules/prettier/bin/prettier.cjs",
        "--check",
        ".agent",
        "AGENTS.md",
        "CLAUDE.md",
        ...changedFiles,
      ],
    ],
    ...(docs
      ? []
      : [
          ["architecture", [".agent/scripts/architecture-check.mjs"]],
          ["evaluations", [".agent/scripts/evaluate.mjs"]],
          ["lint", ["node_modules/eslint/bin/eslint.js", "."]],
          ["typecheck", ["node_modules/typescript/bin/tsc", "--noEmit"]],
          ["tests", ["node_modules/vitest/vitest.mjs", "run"]],
        ]),
    ...(application
      ? [["build", ["node_modules/next/dist/bin/next", "build"]]]
      : []),
  ];
  const results = runChecks(checks);
  const after = gitSnapshot(root);
  const report = {
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    formatting_files: changedFiles,
    before,
    after,
    results,
    skipped: docs
      ? ["architecture/lint/typecheck/tests/build: documentation-only mode"]
      : application
        ? []
        : ["build: use --application"],
    passed:
      results.every((result) => result.exit_code === 0) &&
      before.source_hash === after.source_hash,
  };
  mkdirSync(resolve(root, "artifacts/agent"), { recursive: true });
  writeFileSync(
    resolve(root, "artifacts/agent/verification.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  writeFileSync(
    resolve(root, "artifacts/agent/verification-events.jsonl"),
    verificationEvents(report)
      .map((event) => JSON.stringify(event))
      .join("\n") + "\n",
  );
  console.log(
    `Verification ${report.passed ? "passed" : "failed"}; evidence: artifacts/agent/verification.json`,
  );
  return report.passed ? 0 : 1;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  process.exitCode = verify();
