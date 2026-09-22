import type { Pool, PoolClient } from "pg";

type Queryable = Pick<Pool | PoolClient, "query">;

export async function getIntelligenceHealth(queryable: Queryable) {
  const [queue, evaluations, disagreements, sources] = await Promise.all([
    queryable.query<{
      status: string;
      count: number;
      oldestAvailableAt: string | null;
    }>(
      `SELECT status,count(*)::int AS count,
              min(available_at)::text AS "oldestAvailableAt"
         FROM job_intelligence_queue GROUP BY status ORDER BY status`,
    ),
    queryable.query<{
      total: number;
      review: number;
      averageLatencyMs: number | null;
      inputTokens: number;
      outputTokens: number;
      latestAt: string | null;
    }>(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE policy_status='review')::int AS review,
              round(avg(latency_ms))::int AS "averageLatencyMs",
              COALESCE(sum(input_tokens),0)::int AS "inputTokens",
              COALESCE(sum(output_tokens),0)::int AS "outputTokens",
              max(created_at)::text AS "latestAt"
         FROM jev_evaluations`,
    ),
    queryable.query<{
      careerStage: number;
      workArrangement: number;
    }>(
      `SELECT
         count(*) FILTER (
           WHERE profile.career_stage<>'other'
             AND profile.career_stage<>jobradar_detect_experience(job.title||' '||array_to_string(job.tags,' '))
         )::int AS "careerStage",
         count(*) FILTER (
           WHERE profile.work_arrangement<>'unclear'
             AND profile.work_arrangement<>(CASE
               WHEN job.remote OR jobradar_keyword_match(job.title||' '||array_to_string(job.tags,' ')||' '||job.location,'remote')
                 OR jobradar_keyword_match(job.title||' '||array_to_string(job.tags,' ')||' '||job.location,'worldwide') THEN 'remote'
               WHEN jobradar_keyword_match(job.title||' '||array_to_string(job.tags,' ')||' '||job.location,'hybrid') THEN 'hybrid'
               ELSE 'onsite' END)
         )::int AS "workArrangement"
       FROM job_intelligence_profiles profile JOIN jobs job ON job.id=profile.job_id`,
    ),
    queryable.query<{
      source: string;
      evaluated: number;
      review: number;
    }>(
      `SELECT source.name AS source,count(*)::int AS evaluated,
              count(*) FILTER (WHERE evaluation.policy_status='review')::int AS review
         FROM jev_evaluations evaluation
         JOIN jobs job ON job.id=evaluation.job_id
         JOIN sources source ON source.id=job.source_id
        GROUP BY source.name ORDER BY source.name`,
    ),
  ]);
  return {
    mode: process.env.JEV_MODE || "off",
    queue: queue.rows,
    evaluations: evaluations.rows[0],
    disagreements: disagreements.rows[0],
    sources: sources.rows,
  };
}
