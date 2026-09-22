import type { PoolClient } from "pg";
import { db } from "./db";
import { collect } from "./connectors";
import { sourceSelect } from "./repository";
import type { Source } from "./types";

const matchPredicate = `(NOT m.remote_only OR j.remote)
    AND (m.location='' OR strpos(lower(j.location),lower(m.location))>0 OR (lower(m.location)='sri lanka' AND lower(j.location) ~ '\\m(colombo|kandy|galle|jaffna|gampaha|negombo|matara|kurunegala)\\M'))
    AND jobradar_experience_match(j.title||' '||array_to_string(j.tags,' '), COALESCE((SELECT u.preferences->>'experience' FROM users u WHERE u.id=m.user_id), ''))
    AND EXISTS(SELECT 1 FROM unnest(m.keywords) k WHERE jobradar_keyword_match(j.title||' '||array_to_string(j.tags,' '),k))
    AND NOT EXISTS(SELECT 1 FROM unnest(m.excluded_keywords) k WHERE jobradar_keyword_match(j.title||' '||array_to_string(j.tags,' '),k))`;

export async function rebuildMatches(client: Pick<PoolClient, "query">) {
  await client.query("DELETE FROM monitor_matches");
  await client.query(`INSERT INTO monitor_matches(monitor_id,job_id)
    SELECT m.id,j.id FROM monitors m CROSS JOIN jobs j WHERE m.enabled
    AND ${matchPredicate}
    ON CONFLICT DO NOTHING`);
}

export async function rebuildMatchesForJobs(
  client: Pick<PoolClient, "query">,
  jobIds: string[],
) {
  if (!jobIds.length) return;
  await client.query(
    "DELETE FROM monitor_matches WHERE job_id=ANY($1::uuid[])",
    [jobIds],
  );
  await client.query(
    `INSERT INTO monitor_matches(monitor_id,job_id)
     SELECT m.id,j.id FROM monitors m CROSS JOIN jobs j
     WHERE j.id=ANY($1::uuid[]) AND m.enabled AND ${matchPredicate}
     ON CONFLICT DO NOTHING`,
    [jobIds],
  );
}

export async function rebuildMatchesForMonitor(
  client: Pick<PoolClient, "query">,
  monitorId: string,
) {
  await client.query("DELETE FROM monitor_matches WHERE monitor_id=$1", [
    monitorId,
  ]);
  await client.query(
    `INSERT INTO monitor_matches(monitor_id,job_id)
     SELECT m.id,j.id FROM monitors m CROSS JOIN jobs j
     WHERE m.id=$1 AND m.enabled AND ${matchPredicate}
     ON CONFLICT DO NOTHING`,
    [monitorId],
  );
}

export async function rebuildMatchesForUser(
  client: Pick<PoolClient, "query">,
  userId: string,
) {
  await client.query(
    "DELETE FROM monitor_matches mm USING monitors m WHERE mm.monitor_id=m.id AND m.user_id=$1",
    [userId],
  );
  await client.query(
    `INSERT INTO monitor_matches(monitor_id,job_id)
     SELECT m.id,j.id FROM monitors m CROSS JOIN jobs j
     WHERE m.user_id=$1 AND m.enabled AND ${matchPredicate}
     ON CONFLICT DO NOTHING`,
    [userId],
  );
}
export async function syncSources() {
  const client = await db().connect();
  let locked = false;
  const results: {
    source: string;
    status: string;
    added?: number;
    error?: string;
  }[] = [];
  try {
    const lock = await client.query(
      "SELECT pg_try_advisory_lock(741209) AS locked",
    );
    locked = lock.rows[0].locked;
    if (!locked) return { busy: true, results };
    // A previous process may have stopped after starting a run. The lock proves it is no longer collecting.
    await client.query(
      "UPDATE sync_runs SET status='failed', finished_at=now(), error='Collector interrupted; next scheduled run will retry.' WHERE status='running'",
    );
    const sources = await client.query<Source>(
      `${sourceSelect} WHERE s.enabled AND (s.last_attempt_at IS NULL OR s.last_attempt_at < now()-make_interval(mins=>s.interval_minutes)) ORDER BY s.name`,
    );
    for (const source of sources.rows) {
      await client.query(
        "UPDATE sources SET last_attempt_at=now() WHERE id=$1",
        [source.id],
      );
      const run = await client.query(
        "INSERT INTO sync_runs(source_id) VALUES($1) RETURNING id",
        [source.id],
      );
      const runId = run.rows[0].id;
      try {
        const jobs = await collect(source);
        await client.query("BEGIN");
        const old = await client.query(
          "SELECT external_id FROM jobs WHERE source_id=$1",
          [source.id],
        );
        const ids = new Set(old.rows.map((r) => r.external_id));
        const storedJobIds: string[] = [];
        let added = 0;
        for (const j of jobs) {
          const stored = await client.query<{ id: string }>(
            `INSERT INTO jobs(source_id,external_id,title,company,location,remote,employment_type,salary,tags,description,url,published_at)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
            ON CONFLICT(source_id,external_id) DO UPDATE SET title=excluded.title,company=excluded.company,location=excluded.location,remote=excluded.remote,
            employment_type=excluded.employment_type,salary=excluded.salary,tags=excluded.tags,description=excluded.description,url=excluded.url,
            published_at=COALESCE(excluded.published_at,jobs.published_at),last_seen_at=now(),active=true
            RETURNING id`,
            [
              j.sourceId,
              j.externalId,
              j.title,
              j.company,
              j.location,
              j.remote,
              j.employmentType,
              j.salary,
              j.tags,
              j.description,
              j.url,
              j.publishedAt,
            ],
          );
          storedJobIds.push(stored.rows[0].id);
          const isNew = !ids.has(j.externalId);
          await client.query(
            `INSERT INTO sync_run_jobs(run_id,job_id,is_new) VALUES($1,$2,$3)
             ON CONFLICT(run_id,job_id) DO UPDATE SET is_new=sync_run_jobs.is_new OR excluded.is_new`,
            [runId, stored.rows[0].id, isNew],
          );
          if (isNew) {
            added++;
            ids.add(j.externalId);
          }
        }
        // Serialize match rebuilding with monitor edits, without blocking reads.
        await client.query("SELECT pg_advisory_xact_lock(741210)");
        await rebuildMatchesForJobs(client, storedJobIds);
        await client.query(
          "UPDATE sources SET last_synced_at=now(),last_error=NULL WHERE id=$1",
          [source.id],
        );
        await client.query(
          "UPDATE sync_runs SET status='success',finished_at=now(),fetched=$2,added=$3 WHERE id=$1",
          [runId, jobs.length, added],
        );
        await client.query("COMMIT");
        results.push({ source: source.name, status: "success", added });
      } catch (error) {
        await client.query("ROLLBACK");
        const message =
          error instanceof Error
            ? error.message.slice(0, 500)
            : "Collection failed";
        await client.query("UPDATE sources SET last_error=$2 WHERE id=$1", [
          source.id,
          message,
        ]);
        await client.query(
          "UPDATE sync_runs SET status='failed',finished_at=now(),error=$2 WHERE id=$1",
          [runId, message],
        );
        results.push({ source: source.name, status: "failed", error: message });
      }
    }
    return { busy: false, results };
  } finally {
    try {
      if (locked) await client.query("SELECT pg_advisory_unlock(741209)");
    } finally {
      client.release();
    }
  }
}
