import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { root, safePath } from "./context-check.mjs";
import { buildIndex } from "./update-index.mjs";
import { changedFiles } from "./changed-files.mjs";
import { subsystems, within } from "./subsystems.mjs";

export function impactedPaths(paths, imports) {
  const affected = new Set(paths);
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of imports)
      if (edge.to && affected.has(edge.to) && !affected.has(edge.from)) {
        affected.add(edge.from);
        changed = true;
      }
  }
  return [...affected].sort();
}

export function impactReport(paths, imports, areas = subsystems) {
  const affected = impactedPaths(paths, imports);
  const direct = Object.entries(areas).filter(([, area]) =>
    affected.some((path) =>
      [...area.roots, ...area.tests, ...area.docs].some((prefix) =>
        within(path, prefix),
      ),
    ),
  );
  const selectedNames = new Set(direct.map(([name]) => name));
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const [name, area] of Object.entries(areas))
      if (
        !selectedNames.has(name) &&
        area.depends_on.some((dependency) => selectedNames.has(dependency))
      ) {
        selectedNames.add(name);
        expanded = true;
      }
  }
  const selected = Object.entries(areas).filter(([name]) =>
    selectedNames.has(name),
  );
  const configuration = paths.filter((path) =>
    /(^|\/)(package(-lock)?\.json|.*config\.[^/]+|Dockerfile|.*\.ya?ml)$/.test(
      path,
    ),
  );
  const schema = affected.filter(
    (path) => path.startsWith("db/") || path === "scripts/migrate.ts",
  );
  return {
    changed: paths,
    affected,
    subsystems: selected.map(([name]) => name),
    conceptual_dependants: selected
      .filter(([name]) => !direct.some(([directName]) => directName === name))
      .map(([name]) => name),
    tests: [
      ...new Set([
        ...affected.filter((p) => p.startsWith("tests/")),
        ...selected.flatMap(([, a]) => a.tests),
      ]),
    ].sort(),
    documentation: [...new Set(selected.flatMap(([, a]) => a.docs))].sort(),
    api_contracts: affected.filter((p) => p.startsWith("src/app/api/")),
    shared_interfaces: affected.filter((p) =>
      /(?:types|contract|schema)/i.test(p),
    ),
    schema,
    configuration,
    review: [
      ...selected.flatMap(([, a]) => a.review),
      ...(schema.length || configuration.length
        ? [
            "Review deployment and runtime compatibility manually; no migration or deployment is authorized by this report",
          ]
        : []),
    ],
    unmapped: paths.filter(
      (path) =>
        !Object.values(areas).some((area) =>
          [...area.roots, ...area.tests, ...area.docs].some((prefix) =>
            within(path, prefix),
          ),
        ),
    ),
    verified: false,
    required:
      "Full suite for application changes. Static imports and curated relationships are review candidates, not proof of complete impact or verification.",
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const paths =
    process.argv.length > 2
      ? process.argv.slice(2)
      : changedFiles().changes.flatMap((c) => [
          c.path,
          ...(c.previous_path ? [c.previous_path] : []),
        ]);
  paths.forEach((p) => safePath(root, p));
  const current = buildIndex()["dependencies.json"];
  let historical = { imports: [], provenance: { source_hash: "" } };
  try {
    historical = JSON.parse(
      readFileSync(resolve(root, ".agent/index/dependencies.json"), "utf8"),
    );
  } catch {
    /* Current source remains usable when the cached index is absent. */
  }
  console.log(
    JSON.stringify(
      {
        ...impactReport(paths, [...current.imports, ...historical.imports]),
        source_hash: current.provenance.source_hash,
        cached_index_current:
          current.provenance.source_hash === historical.provenance.source_hash,
        import_evidence:
          "Current source plus historical cached edges; historical edges may over-report impact after deletion or rename",
      },
      null,
      2,
    ),
  );
}
