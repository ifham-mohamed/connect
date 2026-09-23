import { authenticatedRead } from "@/lib/api-read";
import { getWorkspaceAiBudget } from "@/lib/ai-budget";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return authenticatedRead(
    request,
    async (client) => {
      const [database, queue, sources, counters, budget] = await Promise.all([
        client.query(
          `SELECT pg_database_size(current_database())::bigint AS bytes,
            (SELECT count(*)::int FROM jobs) AS jobs,
            (SELECT count(*)::int FROM sync_run_jobs) AS "runRows"`,
        ),
        client.query(
          `SELECT count(*) FILTER(WHERE status='pending')::int AS pending,
            count(*) FILTER(WHERE status='processing')::int AS processing,
            count(*) FILTER(WHERE status='failed')::int AS failed,
            COALESCE(extract(epoch FROM (now()-min(created_at) FILTER(WHERE status='pending'))),0)::int AS "oldestPendingSeconds"
           FROM job_intelligence_queue`,
        ),
        client.query(
          `SELECT COALESCE(sum(runs),0)::int AS runs,COALESCE(sum(fetched),0)::int AS fetched,
            COALESCE(sum(added),0)::int AS added,COALESCE(sum(failed),0)::int AS failed,
            COALESCE(sum(not_modified),0)::int AS "notModified",COALESCE(sum(changed),0)::int AS changed
           FROM source_daily_stats WHERE day>=current_date-6`,
        ),
        client.query(
          `SELECT metric,sum(value)::bigint AS value FROM usage_counters
           WHERE day>=current_date-6 GROUP BY metric ORDER BY metric`,
        ),
        getWorkspaceAiBudget(client),
      ]);
      return {
        database: database.rows[0],
        queue: queue.rows[0],
        sources: sources.rows[0],
        counters: counters.rows,
        budget,
      };
    },
    true,
  );
}
