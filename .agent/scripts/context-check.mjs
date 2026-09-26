import {
  readFileSync,
  readdirSync,
  existsSync,
  lstatSync,
  readlinkSync,
} from "node:fs";
import { resolve, relative, isAbsolute, dirname } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { z } from "zod";
import {
  taskSchema,
  handoffSchema,
  mapSchema,
  provenanceSchema,
} from "./contracts.mjs";

export const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const sourceHash = (path) =>
  hash(
    /\.(?:[cm]?[jt]sx?|json|md|sql|css|ya?ml|toml|svg)$/.test(path)
      ? readFileSync(path, "utf8").replaceAll("\r\n", "\n")
      : readFileSync(path),
  );
export const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export function safePath(directory, path) {
  const absolute = resolve(directory, path);
  const rel = relative(directory, absolute);
  if (isAbsolute(path) || rel.startsWith("..") || isAbsolute(rel))
    throw new Error(`Path escapes repository: ${path}`);
  return absolute;
}

export function ownershipConflicts(states, directory = root) {
  const active = states.filter(
    (state) => state.status !== "complete" && state.workspace,
  );
  const errors = [];
  const canonical = (path) =>
    resolve(directory, path).replaceAll("\\", "/").toLowerCase();
  for (let i = 0; i < active.length; i++) {
    for (const other of active.slice(i + 1)) {
      const state = active[i];
      if (
        state.owner !== other.owner &&
        canonical(state.workspace.worktree) ===
          canonical(other.workspace.worktree)
      )
        errors.push(
          `Shared writable checkout: ${state.task_id} and ${other.task_id}; use separate worktrees or serialize`,
        );
      for (const left of state.workspace.claimed_files)
        for (const right of other.workspace.claimed_files) {
          const a = canonical(left),
            b = canonical(right);
          if (a === b || a.startsWith(b + "/") || b.startsWith(a + "/"))
            errors.push(
              `File claim conflict: ${state.task_id} (${left}) and ${other.task_id} (${right}); serialize overlapping work`,
            );
        }
    }
  }
  return errors;
}

export function gitSnapshot(
  directory,
  git = (...args) =>
    execFileSync("git", args, { cwd: directory, maxBuffer: 32 * 1024 * 1024 }),
) {
  const head = git("rev-parse", "HEAD").toString().trim();
  const status = git("status", "--porcelain=v1", "-z").toString();
  const paths = git(
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
  )
    .toString()
    .split("\0")
    .filter((path) => path && path !== "next-env.d.ts");
  const files = [...new Set(paths)].sort().map((path) => ({
    path,
    // Verification output is excluded to avoid hashing its own previous run.
    sha256: existsSync(resolve(directory, path))
      ? hash(
          lstatSync(resolve(directory, path)).isSymbolicLink()
            ? readlinkSync(resolve(directory, path))
            : readFileSync(resolve(directory, path)),
        )
      : null,
  }));
  return {
    head,
    status,
    source_hash: hash(JSON.stringify(files)),
    diff_hash: hash(
      Buffer.concat([git("diff", "--binary", "HEAD"), Buffer.from(status)]),
    ),
  };
}

export function checkContext(directory = root) {
  const errors = [];
  const json = (path) =>
    JSON.parse(readFileSync(resolve(directory, path), "utf8"));
  const check = (label, fn) => {
    try {
      fn();
    } catch (error) {
      errors.push(`${label}: ${error.message}`);
    }
  };
  check("repo-map", () => {
    const map = mapSchema.parse(json(".agent/index/repo-map.json"));
    if (!map.sources.length)
      throw new Error("Repository map must contain reviewed sources");
    for (const area of Object.values(map.subsystems ?? {})) {
      for (const path of [
        ...area.roots,
        ...area.entrypoints,
        ...area.tests,
        ...area.docs,
      ])
        if (!existsSync(safePath(directory, path)))
          throw new Error(`Missing subsystem path: ${path}`);
      for (const dependency of area.depends_on)
        if (!map.subsystems[dependency])
          throw new Error(`Unknown subsystem: ${dependency}`);
    }
    for (const pkg of Object.values(map.packages ?? {}))
      for (const path of [pkg.root, pkg.tests, ...pkg.entrypoints])
        if (!existsSync(safePath(directory, path)))
          throw new Error(`Missing package path: ${path}`);
    for (const source of map.sources) {
      const path = safePath(directory, source.path);
      if (!existsSync(path)) throw new Error(`Missing source: ${source.path}`);
      if (sourceHash(path) !== source.sha256)
        throw new Error(`Stale source: ${source.path}`);
    }
  });
  for (const [name, schema] of [
    ["task-state", taskSchema],
    ["handoff", handoffSchema],
    ["repo-index", mapSchema],
    ["provenance", provenanceSchema],
  ]) {
    check(`${name} schema`, () => {
      if (
        JSON.stringify(json(`.agent/schemas/${name}.schema.json`)) !==
        JSON.stringify(z.toJSONSchema(schema))
      )
        throw new Error("JSON Schema differs from runtime contract");
    });
  }
  const tasks = resolve(directory, ".agent/tasks");
  const states = [];
  if (existsSync(tasks))
    for (const entry of readdirSync(tasks, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      check(entry.name, () => {
        const state = taskSchema.parse(
          json(`.agent/tasks/${entry.name}/state.json`),
        );
        if (state.task_id !== entry.name)
          throw new Error("Task ID differs from directory");
        if (state.status === "complete" && state.remaining.length)
          throw new Error("Completed task has remaining work");
        for (const file of ["brief.md", "plan.md", "verification.md"])
          if (!existsSync(resolve(tasks, entry.name, file)))
            throw new Error(`Missing ${file}`);
        for (const path of state.intended_files) safePath(directory, path);
        for (const path of state.workspace?.claimed_files ?? [])
          safePath(directory, path);
        states.push(state);
        const handoff = resolve(tasks, entry.name, "handoff.json");
        if (existsSync(handoff)) {
          const parsed = handoffSchema.parse(
            JSON.parse(readFileSync(handoff, "utf8")),
          );
          if (parsed.task_id !== state.task_id)
            throw new Error("Handoff task mismatch");
        }
      });
    }
  errors.push(...ownershipConflicts(states, directory));
  const documents = existsSync(resolve(directory, "docs"))
    ? readdirSync(resolve(directory, "docs"), { recursive: true })
        .filter(
          (name) =>
            name.endsWith(".md") &&
            !name.endsWith("codex_claude_unified_orchestration_blueprint.md"),
        )
        .map((name) => `docs/${name.replaceAll("\\", "/")}`)
    : [];
  for (const path of [
    ...documents,
    ...readdirSync(resolve(directory, ".agent/context"))
      .filter((name) => name.endsWith(".md"))
      .map((name) => `.agent/context/${name}`),
  ])
    check(path, () => {
      const content = readFileSync(resolve(directory, path), "utf8");
      for (const match of content.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)) {
        if (/^https?:/.test(match[1])) continue;
        if (!existsSync(resolve(directory, dirname(path), match[1])))
          throw new Error(`Broken link: ${match[1]}`);
      }
      if (path.endsWith("navigation.md")) {
        for (const match of content.matchAll(
          /(?:src|tests|docs|scripts|db|\.agent)\/[\w./-]+/g,
        )) {
          if (!existsSync(safePath(directory, match[0])))
            throw new Error(`Missing navigation path: ${match[0]}`);
        }
      }
    });
  return errors;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const errors = checkContext();
  for (const error of errors) console.error(error);
  if (!errors.length) {
    const snapshot = gitSnapshot(root);
    console.log(
      `Context valid. Resume against HEAD ${snapshot.head}; inspect git status before editing.`,
    );
  }
  process.exitCode = errors.length ? 1 : 0;
}
