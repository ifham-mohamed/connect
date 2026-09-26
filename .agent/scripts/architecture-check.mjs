import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndex } from "./update-index.mjs";

// Enforce the accepted extractions, without imposing hypothetical layers.
export function boundaryViolations(imports) {
  return imports
    .filter((edge) => {
      const presentation =
        edge.to && /^(src\/app\/|src\/components\/)/.test(edge.to);
      if (edge.from === "src/lib/matching-repository.ts")
        return (
          presentation ||
          (edge.to &&
            /^src\/lib\/(sync\.[cm]?ts|connectors\.[cm]?ts|intelligence\/)/.test(
              edge.to,
            ))
        );
      if (edge.from.startsWith("src/lib/actions/"))
        return presentation || /^next(?:\/|$)/.test(edge.specifier);
      return false;
    })
    .map((edge) => `${edge.from} must not import ${edge.to ?? edge.specifier}`);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const errors = boundaryViolations(buildIndex()["dependencies.json"].imports);
  errors.forEach((error) => console.error(error));
  if (!errors.length)
    console.log("Resolved matching/action import boundaries passed.");
  process.exitCode = errors.length ? 1 : 0;
}
