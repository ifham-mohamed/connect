import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { root } from "./context-check.mjs";
import { recordActivity } from "./lifecycle.mjs";

export function routeTask(prompt) {
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 10000)
    throw new Error("Provide a bounded task description");
  const text = prompt.toLowerCase();
  const consequential =
    /\b(production|force.push|rotate secrets|publish|deploy|delete.*users|send.*email)\b/.test(
      text,
    );
  const explanation = /^(explain|what is|what are|define)\b/.test(text);
  let skill = "implementation";
  if (explanation) skill = "repo-discovery";
  else if (/\b(release|deploy|publish)\b/.test(text)) skill = "release";
  else if (/\b(review|audit)\b/.test(text))
    skill =
      /\b(auth|authentication|security|session|private|permission|token)\b/.test(
        text,
      )
        ? "security-review"
        : "code-review";
  else if (/\b(verify|validate|test results|run tests)\b/.test(text))
    skill = "verification";
  else if (/\b(architecture|boundaries|tradeoffs|split.*service)\b/.test(text))
    skill = "architecture-analysis";
  else if (/\b(plan|design.*change)\b/.test(text)) skill = "change-planning";
  else if (/\b(locate|find|where|discover)\b/.test(text))
    skill = "repo-discovery";
  const security =
    /\b(auth|authentication|session|password|token|private|security|production)\b/.test(
      text,
    );
  const complex =
    security ||
    /\b(migration|multi.module|architecture|refactor|dependency)\b/.test(text);
  const contexts = [
    ".agent/context/project.md",
    ".agent/context/navigation.md",
    security
      ? ".agent/context/security.md"
      : skill === "architecture-analysis"
        ? ".agent/context/architecture.md"
        : ".agent/context/conventions.md",
  ];
  return {
    skill,
    role: ["code-review", "security-review"].includes(skill)
      ? "reviewer"
      : skill === "release"
        ? "release"
        : [
              "repo-discovery",
              "architecture-analysis",
              "change-planning",
            ].includes(skill)
          ? "planner"
          : skill === "verification"
            ? "verifier"
            : "implementer",
    contexts,
    workflow: complex
      ? "discover-impact-plan-implement-verify-review"
      : "inspect-act-verify",
    action_gate: consequential
      ? "explicit-authorization-required"
      : explanation
        ? "read-only"
        : "task-scope-required",
    execute: false,
  };
}

export function contextMetrics(paths, directory = root) {
  const files = paths.map((path) => {
    if (!/^\.agent\/context\/[a-z-]+\.md$/.test(path))
      throw new Error("Only curated context documents may be measured");
    const body = readFileSync(resolve(directory, path), "utf8");
    return {
      path,
      bytes: Buffer.byteLength(body),
      characters: body.length,
      estimated_tokens: Math.ceil(Buffer.byteLength(body) / 4),
    };
  });
  return {
    files,
    bytes: files.reduce((n, f) => n + f.bytes, 0),
    estimated_tokens: files.reduce((n, f) => n + f.estimated_tokens, 0),
    method: "UTF-8 bytes / 4 estimate; not provider token accounting",
    actual_model_tokens: null,
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = routeTask(process.argv.slice(2).join(" "));
  const metrics = contextMetrics(result.contexts);
  recordActivity("route_selected", {
    skill: result.skill,
    role: result.role,
    context_bytes: metrics.bytes,
    estimated_tokens: metrics.estimated_tokens,
  });
  console.log(JSON.stringify({ ...result, context_metrics: metrics }, null, 2));
}
