import { db } from "../src/lib/db";
import { syncSources } from "../src/lib/sync";
import type { SourceKind } from "../src/lib/types";

const [kindValue, board = ""] = process.argv.slice(2);
const allowed = new Set<SourceKind>([
  "itpro",
  "topjobs",
  "rooster",
  "lever",
]);

if (!allowed.has(kindValue as SourceKind)) {
  console.error("Choose one supported source: itpro, topjobs, rooster, or lever.");
  process.exit(1);
}

const kind = kindValue as SourceKind;

try {
  const result = await syncSources({ kind, board, force: true });
  const coverage = await db().query(
    `SELECT count(*)::int AS jobs,
            count(*) FILTER (WHERE length(j.description)>180)::int AS "withDescription",
            count(*) FILTER (WHERE j.source_image_url<>'')::int AS "withImage"
       FROM jobs j JOIN sources s ON s.id=j.source_id
      WHERE s.kind=$1 AND s.board=$2`,
    [kind, board],
  );
  console.log(JSON.stringify({ ...result, coverage: coverage.rows[0] }));
  if (
    result.busy ||
    !result.results.length ||
    result.results.some((source) => source.status !== "success")
  )
    process.exitCode = 1;
} finally {
  await db().end();
}
