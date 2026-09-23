import type { Pool, PoolClient } from "pg";

type Queryable = Pick<Pool | PoolClient, "query">;
export type RevisionScope =
  "jobs" | "sources" | "runs" | "monitors" | "states" | "profile";

export async function bumpRevision(
  queryable: Queryable,
  scope: RevisionScope,
  userId?: string,
) {
  if (userId) {
    await queryable.query(
      `INSERT INTO data_revisions(scope,user_id,version) VALUES($1,$2,1)
       ON CONFLICT (scope,user_id) WHERE user_id IS NOT NULL DO UPDATE
         SET version=data_revisions.version+1,updated_at=now()`,
      [scope, userId],
    );
    return;
  }
  await queryable.query(
    `INSERT INTO data_revisions(scope,user_id,version) VALUES($1,NULL,1)
     ON CONFLICT (scope) WHERE user_id IS NULL DO UPDATE
       SET version=data_revisions.version+1,updated_at=now()`,
    [scope],
  );
}

export async function getRevisions(queryable: Queryable, userId: string) {
  const result = await queryable.query<{ scope: string; version: number }>(
    `SELECT scope,version::int FROM data_revisions
      WHERE user_id IS NULL OR user_id=$1`,
    [userId],
  );
  return Object.fromEntries(result.rows.map((row) => [row.scope, row.version]));
}

export async function incrementUsage(
  queryable: Queryable,
  metric: string,
  amount = 1,
) {
  await queryable.query(
    `INSERT INTO usage_counters(day,metric,value) VALUES((now() AT TIME ZONE 'Asia/Colombo')::date,$1,$2)
     ON CONFLICT(day,metric) DO UPDATE SET value=usage_counters.value+excluded.value`,
    [metric.slice(0, 120), amount],
  );
}
