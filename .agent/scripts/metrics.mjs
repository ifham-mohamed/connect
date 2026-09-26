import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { root } from "./context-check.mjs";

export function summarizeEvents(events) {
  const checks = events.filter((e) => e.event === "check_completed");
  return {
    events: events.length,
    counts: events.reduce((counts, event) => {
      counts[event.event] = (counts[event.event] ?? 0) + 1;
      return counts;
    }, {}),
    checks: checks.length,
    failed_checks: checks.filter((e) => e.exit_code !== 0).length,
    check_duration_ms: checks.reduce((n, e) => n + e.duration_ms, 0),
    actual_model_tokens: null,
    human_corrections: null,
    scope:
      "Recorded local lifecycle events and latest verification only; unavailable metrics are null",
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const events = ["lifecycle.jsonl", "verification-events.jsonl"].flatMap(
    (name) => {
      const path = resolve(root, "artifacts/agent", name);
      return existsSync(path)
        ? readFileSync(path, "utf8")
            .trim()
            .split(/\r?\n/)
            .filter(Boolean)
            .map((line) => JSON.parse(line))
        : [];
    },
  );
  console.log(JSON.stringify(summarizeEvents(events), null, 2));
}
