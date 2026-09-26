import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { routeTask } from "./route.mjs";
import { root, hash } from "./context-check.mjs";

export function evaluateRouting(cases, router = routeTask) {
  return cases.map(({ id, prompt, expected }) => {
    try {
      const observed = router(prompt);
      return {
        id,
        passed: Object.entries(expected).every(
          ([key, value]) => observed[key] === value,
        ),
        observed,
      };
    } catch {
      return { id, passed: expected.reject === true, observed: "rejected" };
    }
  });
}

export function evaluate() {
  const path = resolve(root, ".agent/evals/routing.json");
  const source = readFileSync(path, "utf8");
  const cases = JSON.parse(source);
  const results = evaluateRouting(cases);
  const skills = [
    ...new Set(cases.map((c) => c.expected.skill).filter(Boolean)),
  ];
  const instructions = skills.map((skill) => {
    const body = readFileSync(
      resolve(root, ".agent/skills", skill, "SKILL.md"),
      "utf8",
    );
    return {
      skill,
      sha256: hash(body),
      valid_metadata: body.startsWith("---\n") || body.startsWith("---\r\n"),
    };
  });
  const report = {
    kind: "deterministic routing and instruction-contract evaluation",
    fixture_hash: hash(source),
    router_hash: hash(readFileSync(resolve(root, ".agent/scripts/route.mjs"))),
    results,
    instructions,
    model_behavior_evaluated: false,
    passed:
      results.every((r) => r.passed) &&
      instructions.every((s) => s.valid_metadata),
  };
  mkdirSync(resolve(root, "artifacts/agent"), { recursive: true });
  writeFileSync(
    resolve(root, "artifacts/agent/evaluation.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    `${results.filter((r) => r.passed).length}/${results.length} routing evaluations passed; ${instructions.length} skill contracts inspected. Model behavior is not measured by this check.`,
  );
  for (const result of results.filter((r) => !r.passed))
    console.error(JSON.stringify(result));
  return report.passed ? 0 : 1;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  process.exitCode = evaluate();
