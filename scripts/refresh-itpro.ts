import { db } from "../src/lib/db";
import { syncSources } from "../src/lib/sync";
import { fetchItproJobDetail } from "../src/lib/connectors";
import { jevQueueEnabled } from "../src/lib/jev/config";
import { queueJobsForIntelligence } from "../src/lib/intelligence/queue";

try {
  const result = await syncSources({
    kind: "itpro",
    board: "software-engineering",
    force: true,
  });
  console.log(JSON.stringify(result));
  if (
    result.busy ||
    !result.results.length ||
    result.results.some((source) => source.status !== "success")
  ) {
    process.exitCode = 1;
  } else {
    const sparse = await db().query<{ id: string; url: string }>(
      `SELECT j.id,j.url FROM jobs j JOIN sources s ON s.id=j.source_id
       WHERE s.kind='itpro' AND s.board='software-engineering' AND length(j.description)<180`,
    );
    const updated: string[] = [];
    for (const job of sparse.rows) {
      try {
        const detail = await fetchItproJobDetail(job.url);
        await db().query(
          `UPDATE jobs SET description=$2,employment_type=COALESCE(NULLIF($3,''),employment_type)
           WHERE id=$1`,
          [job.id, detail.description, detail.employmentType],
        );
        updated.push(job.id);
      } catch {
        // Older listings may no longer be available. Keep their existing summaries.
      }
    }
    if (jevQueueEnabled()) await queueJobsForIntelligence(db(), updated);
    console.log(
      JSON.stringify({
        olderListingsChecked: sparse.rows.length,
        updated: updated.length,
      }),
    );
  }
} finally {
  await db().end();
}
