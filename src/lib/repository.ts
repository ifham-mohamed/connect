import { db } from "./db";
import type { DashboardData, Monitor, Source } from "./types";
import type { AuthUser } from "./auth";
import type { PoolClient } from "pg";
export const sourceSelect = `SELECT s.id, s.name, s.kind, s.board, s.enabled, s.interval_minutes AS "intervalMinutes", s.last_synced_at AS "lastSyncedAt", s.last_attempt_at AS "lastAttemptAt", s.last_error AS "lastError", (SELECT count(*)::int FROM jobs j WHERE j.source_id=s.id) AS "jobCount" FROM sources s`;
export const monitorSelect = `SELECT id, user_id AS "userId", name, keywords, excluded_keywords AS "excludedKeywords", location, remote_only AS "remoteOnly", enabled, created_at AS "createdAt" FROM monitors`;
export const jobSelect = `SELECT j.id, j.external_id AS "externalId", j.source_id AS "sourceId", s.name AS "sourceName", j.title, j.company, j.location, j.remote, j.employment_type AS "employmentType", j.salary, j.tags, j.description, j.url, j.published_at AS "publishedAt", j.first_seen_at AS "firstSeenAt", j.last_seen_at AS "lastSeenAt", j.status, j.active, COALESCE((SELECT array_agg(mm.monitor_id::text) FROM monitor_matches mm JOIN monitors m ON m.id=mm.monitor_id WHERE mm.job_id=j.id AND m.enabled), ARRAY[]::text[]) AS "matchedMonitors" FROM jobs j JOIN sources s ON s.id=j.source_id`;
export async function getDashboard(
  user: AuthUser,
  existingClient?: PoolClient,
): Promise<DashboardData> {
  const client = existingClient || (await db().connect());
  try {
    const jobs = await client.query(
      `${jobSelect.replace("WHERE mm.job_id=j.id AND m.enabled", "WHERE mm.job_id=j.id AND m.enabled AND m.user_id=$1")} ORDER BY COALESCE(j.published_at,j.first_seen_at) DESC LIMIT 1000`,
      [user.id],
    );
    const monitors = await client.query<Monitor>(
      `${monitorSelect} WHERE user_id=$1 ORDER BY created_at`,
      [user.id],
    );
    const sources = await client.query<Source>(`${sourceSelect} ORDER BY name`);
    const runs = await client.query(
      `SELECT r.id, s.name AS "sourceName", r.started_at AS "startedAt", r.finished_at AS "finishedAt", r.status, r.fetched, r.added, r.error FROM sync_runs r JOIN sources s ON s.id=r.source_id ORDER BY r.started_at DESC LIMIT 50`,
    );
    return JSON.parse(
      JSON.stringify({
        mode: "live",
        jobs: jobs.rows,
        monitors: monitors.rows,
        sources: sources.rows,
        runs: runs.rows,
        authenticated: true,
        user,
      }),
    );
  } finally {
    if (!existingClient) client.release();
  }
}
