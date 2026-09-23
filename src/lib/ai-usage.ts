import type { Pool, PoolClient } from "pg";
import type { AuthUser } from "./auth";

type Queryable = Pick<Pool | PoolClient, "query">;

export type AiUsage = {
  unlimited: boolean;
  memberLimit: number;
  limit: number | null;
  used: number;
  pending: number;
  remaining: number | null;
  resetAt: string;
};

type UsageRow = {
  limit: number;
  used: number;
  pending: number;
  resetAt: string;
};

async function expireAbandonedReservations(queryable: Queryable) {
  await queryable.query(
    `UPDATE ai_job_analysis_usage
        SET status='failed',completed_at=now()
      WHERE status='reserved' AND created_at<now()-interval '10 minutes'`,
  );
}

export async function getAiUsage(
  queryable: Queryable,
  user: Pick<AuthUser, "id" | "role">,
): Promise<AiUsage> {
  await expireAbandonedReservations(queryable);
  const result = await queryable.query<UsageRow>(
    `SELECT policy.member_daily_job_analysis_limit::int AS limit,
            count(*) FILTER (WHERE usage.status='succeeded')::int AS used,
            count(*) FILTER (WHERE usage.status='reserved')::int AS pending,
            ((timezone('Asia/Colombo',now())::date+1)::timestamp
              AT TIME ZONE 'Asia/Colombo')::text AS "resetAt"
       FROM ai_usage_policy policy
       LEFT JOIN ai_job_analysis_usage usage
         ON usage.user_id=$1
        AND usage.usage_date=timezone('Asia/Colombo',now())::date
      WHERE policy.singleton=true
      GROUP BY policy.member_daily_job_analysis_limit`,
    [user.id],
  );
  const row = result.rows[0] || {
    limit: 5,
    used: 0,
    pending: 0,
    resetAt: new Date(Date.now() + 86_400_000).toISOString(),
  };
  if (user.role === "owner")
    return {
      unlimited: true,
      memberLimit: row.limit,
      limit: null,
      used: row.used,
      pending: row.pending,
      remaining: null,
      resetAt: row.resetAt,
    };
  return {
    unlimited: false,
    memberLimit: row.limit,
    limit: row.limit,
    used: row.used,
    pending: row.pending,
    remaining: Math.max(0, row.limit - row.used - row.pending),
    resetAt: row.resetAt,
  };
}

export async function reserveAiJobAnalysis(
  client: PoolClient,
  user: Pick<AuthUser, "id" | "role">,
  jobId: string,
) {
  if (user.role === "owner")
    return { reservationId: null, usage: await getAiUsage(client, user) };
  await client.query("BEGIN");
  try {
    await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
      user.id,
    ]);
    const usage = await getAiUsage(client, user);
    if ((usage.remaining ?? 0) <= 0) {
      await client.query("COMMIT");
      return { reservationId: null, usage };
    }
    const reservation = await client.query<{ id: string }>(
      `INSERT INTO ai_job_analysis_usage(user_id,job_id,usage_date,status)
       VALUES($1,$2,timezone('Asia/Colombo',now())::date,'reserved')
       RETURNING id`,
      [user.id, jobId],
    );
    await client.query("COMMIT");
    return {
      reservationId: reservation.rows[0].id,
      usage: {
        ...usage,
        pending: usage.pending + 1,
        remaining: Math.max(0, (usage.remaining ?? 1) - 1),
      },
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}

export async function completeAiJobAnalysis(
  queryable: Queryable,
  reservationId: string | null,
  succeeded: boolean,
) {
  if (!reservationId) return;
  await queryable.query(
    `UPDATE ai_job_analysis_usage
        SET status=$2,completed_at=now()
      WHERE id=$1 AND status='reserved'`,
    [reservationId, succeeded ? "succeeded" : "failed"],
  );
}

export async function memberUsageSummary(queryable: Queryable) {
  const result = await queryable.query<{
    activeMembers: number;
    analyses: number;
    pending: number;
  }>(
    `SELECT count(DISTINCT usage.user_id)::int AS "activeMembers",
            count(*) FILTER (WHERE usage.status='succeeded')::int AS analyses,
            count(*) FILTER (WHERE usage.status='reserved')::int AS pending
       FROM ai_job_analysis_usage usage
       JOIN users account ON account.id=usage.user_id AND account.role='member'
      WHERE usage.usage_date=timezone('Asia/Colombo',now())::date`,
  );
  return result.rows[0] || { activeMembers: 0, analyses: 0, pending: 0 };
}
