import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { db } from "./db";
import { collect } from "./connectors";
import { sourceSelect } from "./repository";
import type { Source } from "./types";
import { jevQueueEnabled } from "./jev/config";
import { queueJobsForIntelligence } from "./intelligence/queue";

const assistedMatching = process.env.JEV_MODE === "assisted";
const modeAndExperiencePredicate = assistedMatching
  ? `jobradar_assisted_match(j.id,s.kind,j.title||' '||array_to_string(j.tags,' '),j.location,j.remote,m.work_modes,
      COALESCE((SELECT u.preferences->>'experience' FROM users u WHERE u.id=m.user_id), ''))`
  : `jobradar_work_mode_match(j.remote,j.title||' '||array_to_string(j.tags,' ')||' '||j.location,m.work_modes)
    AND jobradar_experience_match(j.title||' '||array_to_string(j.tags,' '), COALESCE((SELECT u.preferences->>'experience' FROM users u WHERE u.id=m.user_id), ''))`;
const matchPredicate = `(NOT m.remote_only OR j.remote)
    AND ${modeAndExperiencePredicate}
    AND (m.location='' OR strpos(lower(j.location),lower(m.location))>0 OR (lower(m.location)='sri lanka' AND lower(j.location) ~ '\\m(sri lanka|western province|central province|southern province|northern province|eastern province|north western province|north central province|uva province|sabaragamuwa province|colombo|kandy|galle|jaffna|gampaha|negombo|matara|kurunegala|anuradhapura|polonnaruwa|badulla|ratnapura|trincomalee|batticaloa|kalutara|hambantota|kilinochchi|mannar|mullaitivu|vavuniya|puttalam|matale|nuwara eliya|kegalle|monaragala|ampara)\\M'))
    AND EXISTS(SELECT 1 FROM unnest(m.keywords) k WHERE jobradar_keyword_match(j.title||' '||array_to_string(j.tags,' '),k))
    AND NOT EXISTS(SELECT 1 FROM unnest(m.excluded_keywords) k WHERE jobradar_keyword_match(j.title||' '||array_to_string(j.tags,' '),k))`;

export async function rebuildMatches(client: Pick<PoolClient, "query">) {
  await client.query("DELETE FROM monitor_matches");
  await client.query(`INSERT INTO monitor_matches(monitor_id,job_id)
    SELECT m.id,j.id FROM monitors m CROSS JOIN jobs j JOIN sources s ON s.id=j.source_id WHERE m.enabled
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
     SELECT m.id,j.id FROM monitors m CROSS JOIN jobs j JOIN sources s ON s.id=j.source_id
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
     SELECT m.id,j.id FROM monitors m CROSS JOIN jobs j JOIN sources s ON s.id=j.source_id
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
     SELECT m.id,j.id FROM monitors m CROSS JOIN jobs j JOIN sources s ON s.id=j.source_id
     WHERE m.user_id=$1 AND m.enabled AND ${matchPredicate}
     ON CONFLICT DO NOTHING`,
    [userId],
  );
}
type SyncOptions = {
  kind?: Source["kind"];
  board?: string;
  force?: boolean;
  maxSources?: number;
};

function jobContentHash(job: Awaited<ReturnType<typeof collect>>[number]) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        title: job.title,
        company: job.company,
        location: job.location,
        remote: job.remote,
        employmentType: job.employmentType,
        salary: job.salary,
        tags: [...job.tags].sort(),
        description: job.description,
        url: job.url,
        publishedAt: job.publishedAt,
        sourceImageUrl: job.sourceImageUrl || "",
      }),
    )
    .digest("hex");
}

async function claimDueSource(client: PoolClient, options: SyncOptions) {
  const token = randomUUID();
  const values: unknown[] = [token];
  const clauses = [
    "s.enabled",
    "(s.lease_until IS NULL OR s.lease_until<now())",
  ];
  if (options.kind) {
    values.push(options.kind, options.board || "");
    clauses.push(`s.kind=$2`, `s.board=$3`);
  }
  if (!options.force)
    clauses.push(
      "(s.last_attempt_at IS NULL OR s.last_attempt_at<now()-make_interval(mins=>s.interval_minutes))",
    );
  const claim = await client.query<{ id: string }>(
    `WITH candidate AS (
       SELECT s.id FROM sources s WHERE ${clauses.join(" AND ")}
       ORDER BY s.last_attempt_at NULLS FIRST,s.name
       FOR UPDATE SKIP LOCKED LIMIT 1
     )
     UPDATE sources s SET lease_token=$1,lease_until=now()+interval '12 minutes',last_attempt_at=now()
     FROM candidate WHERE s.id=candidate.id RETURNING s.id`,
    values,
  );
  if (!claim.rows[0]) return null;
  const source = await client.query<Source>(`${sourceSelect} WHERE s.id=$1`, [
    claim.rows[0].id,
  ]);
  return { source: source.rows[0], token };
}

async function processClaimedSource(
  client: PoolClient,
  source: Source,
  leaseToken: string,
) {
  await client.query(
    `UPDATE sync_runs SET status='failed',finished_at=now(),
       error='Collector lease expired; a later schedule retried this source.'
     WHERE source_id=$1 AND status='running' AND started_at<now()-interval '12 minutes'`,
    [source.id],
  );
  const run = await client.query<{ id: string }>(
    "INSERT INTO sync_runs(source_id) VALUES($1) RETURNING id",
    [source.id],
  );
  const runId = run.rows[0].id;
  let transaction = false;
  try {
    const jobs = await collect(source);
    await client.query("BEGIN");
    transaction = true;
    const old = await client.query<{ external_id: string }>(
      "SELECT external_id FROM jobs WHERE source_id=$1",
      [source.id],
    );
    const knownIds = new Set(old.rows.map((row) => row.external_id));
    const runJobs: Array<{ id: string; isNew: boolean }> = [];
    const changedJobIds: string[] = [];
    let added = 0;
    for (const job of jobs) {
      const hash = jobContentHash(job);
      const stored = await client.query<{ id: string; changed: boolean }>(
        `WITH changed AS (
           INSERT INTO jobs(source_id,external_id,title,company,location,remote,employment_type,salary,tags,description,url,published_at,source_image_url,content_hash)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$15)
           ON CONFLICT(source_id,external_id) DO UPDATE SET
             title=excluded.title,company=excluded.company,location=excluded.location,remote=excluded.remote,
             employment_type=CASE WHEN $14::boolean THEN jobs.employment_type ELSE excluded.employment_type END,
             salary=excluded.salary,tags=excluded.tags,
             description=CASE WHEN $14::boolean THEN jobs.description ELSE excluded.description END,url=excluded.url,
             source_image_url=CASE WHEN $14::boolean THEN jobs.source_image_url ELSE excluded.source_image_url END,
             published_at=COALESCE(excluded.published_at,jobs.published_at),last_seen_at=now(),active=true,content_hash=excluded.content_hash
           WHERE jobs.content_hash IS DISTINCT FROM excluded.content_hash
           RETURNING id
         )
         SELECT id,true AS changed FROM changed
         UNION ALL
         SELECT id,false AS changed FROM jobs
          WHERE source_id=$1 AND external_id=$2 AND NOT EXISTS(SELECT 1 FROM changed)
         LIMIT 1`,
        [
          job.sourceId,
          job.externalId,
          job.title,
          job.company,
          job.location,
          job.remote,
          job.employmentType,
          job.salary,
          job.tags,
          job.description,
          job.url,
          job.publishedAt,
          job.sourceImageUrl || "",
          Boolean(job.detailFetchFailed),
          hash,
        ],
      );
      const row = stored.rows[0];
      const isNew = !knownIds.has(job.externalId);
      runJobs.push({ id: row.id, isNew });
      if (row.changed) changedJobIds.push(row.id);
      if (isNew) {
        added++;
        knownIds.add(job.externalId);
      }
    }
    if (runJobs.length)
      await client.query(
        `INSERT INTO sync_run_jobs(run_id,job_id,is_new)
         SELECT $1,item.id,item.is_new FROM jsonb_to_recordset($2::jsonb) AS item(id uuid,is_new boolean)
         ON CONFLICT(run_id,job_id) DO UPDATE SET is_new=sync_run_jobs.is_new OR excluded.is_new`,
        [
          runId,
          JSON.stringify(
            runJobs.map((item) => ({ id: item.id, is_new: item.isNew })),
          ),
        ],
      );
    if (changedJobIds.length && jevQueueEnabled())
      await queueJobsForIntelligence(client, changedJobIds);
    if (changedJobIds.length) {
      await client.query("SELECT pg_advisory_xact_lock(741210)");
      await rebuildMatchesForJobs(client, changedJobIds);
    }
    await client.query(
      `UPDATE sources SET last_synced_at=now(),last_error=NULL,
        response_etag=COALESCE($3,response_etag),response_last_modified=COALESCE($4,response_last_modified)
       WHERE id=$1 AND lease_token=$2`,
      [
        source.id,
        leaseToken,
        jobs.responseEtag || null,
        jobs.responseLastModified || null,
      ],
    );
    await client.query(
      "UPDATE sync_runs SET status='success',finished_at=now(),fetched=$2,added=$3 WHERE id=$1",
      [runId, jobs.length, added],
    );
    await client.query(
      `INSERT INTO source_daily_stats(day,source_id,runs,fetched,added,not_modified,changed)
       VALUES((now() AT TIME ZONE 'Asia/Colombo')::date,$1,1,$2,$3,$4,$5)
       ON CONFLICT(day,source_id) DO UPDATE SET runs=source_daily_stats.runs+1,
         fetched=source_daily_stats.fetched+excluded.fetched,added=source_daily_stats.added+excluded.added,
         not_modified=source_daily_stats.not_modified+excluded.not_modified,
         changed=source_daily_stats.changed+excluded.changed`,
      [
        source.id,
        jobs.length,
        added,
        jobs.notModified ? 1 : 0,
        changedJobIds.length,
      ],
    );
    await client.query("COMMIT");
    transaction = false;
    return {
      source: source.name,
      status: "success",
      added,
      changed: changedJobIds.length,
      notModified: Boolean(jobs.notModified),
    };
  } catch (error) {
    if (transaction) await client.query("ROLLBACK").catch(() => {});
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
    await client.query(
      `INSERT INTO source_daily_stats(day,source_id,runs,failed)
       VALUES((now() AT TIME ZONE 'Asia/Colombo')::date,$1,1,1)
       ON CONFLICT(day,source_id) DO UPDATE SET runs=source_daily_stats.runs+1,failed=source_daily_stats.failed+1`,
      [source.id],
    );
    return { source: source.name, status: "failed", error: message };
  } finally {
    await client.query(
      "UPDATE sources SET lease_token=NULL,lease_until=NULL WHERE id=$1 AND lease_token=$2",
      [source.id, leaseToken],
    );
  }
}

export async function syncNextSource(
  options: SyncOptions = {},
  pool: Pool = db(),
) {
  const client = await pool.connect();
  try {
    const claim = await claimDueSource(client, options);
    if (!claim) return { processed: false, moreDue: false, result: null };
    const result = await processClaimedSource(
      client,
      claim.source,
      claim.token,
    );
    const more = await client.query(
      `SELECT EXISTS(SELECT 1 FROM sources s WHERE s.enabled
        AND (s.lease_until IS NULL OR s.lease_until<now())
        AND (s.last_attempt_at IS NULL OR s.last_attempt_at<now()-make_interval(mins=>s.interval_minutes))) AS due`,
    );
    return { processed: true, moreDue: Boolean(more.rows[0]?.due), result };
  } finally {
    client.release();
  }
}

export async function syncSources(
  options: SyncOptions = {},
  pool: Pool = db(),
) {
  const results: {
    source: string;
    status: string;
    added?: number;
    changed?: number;
    notModified?: boolean;
    error?: string;
  }[] = [];
  const maxSources = Math.max(1, Math.min(options.maxSources ?? 25, 50));
  for (let index = 0; index < maxSources; index++) {
    const next = await syncNextSource(options, pool);
    if (!next.processed) break;
    if (next.result) results.push(next.result);
    if (options.force) break;
    if (!next.moreDue && !options.force) break;
  }
  return { busy: false, results };
}
