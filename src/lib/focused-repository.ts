import type { PoolClient } from "pg";
import type { AuthUser } from "./auth";
import { monitorSelect, sourceSelect } from "./repository";

export function encodeCursor(value: { at: string; id: string }) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function decodeCursor(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (typeof parsed.at !== "string" || typeof parsed.id !== "string")
      return null;
    return parsed as { at: string; id: string };
  } catch {
    return null;
  }
}

export async function listJobs(
  client: PoolClient,
  user: AuthUser,
  input: {
    limit: number;
    cursor: { at: string; id: string } | null;
    search: string;
    status: string;
    monitor: string;
    source: string;
    matched?: boolean;
    location?: string;
    mode?: string;
  },
) {
  const values: unknown[] = [user.id, user.role];
  const add = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  const where = [
    `($2::text='owner' OR personal_state.job_id IS NOT NULL OR EXISTS (
    SELECT 1 FROM monitor_matches vm JOIN monitors m ON m.id=vm.monitor_id
    WHERE vm.job_id=j.id AND m.user_id=$1 AND m.enabled))`,
  ];
  if (input.cursor) {
    const at = add(input.cursor.at);
    const id = add(input.cursor.id);
    where.push(
      `(COALESCE(j.published_at,j.first_seen_at),j.id)<(${at}::timestamptz,${id}::uuid)`,
    );
  }
  if (input.search) {
    const search = add(`%${input.search}%`);
    where.push(
      `(j.title ILIKE ${search} OR j.company ILIKE ${search} OR j.location ILIKE ${search})`,
    );
  }
  if (input.status && input.status !== "all")
    where.push(`COALESCE(personal_state.status,'new')=${add(input.status)}`);
  if (input.monitor && input.monitor !== "all")
    where.push(
      `EXISTS(SELECT 1 FROM monitor_matches fm WHERE fm.job_id=j.id AND fm.monitor_id=${add(input.monitor)}::uuid)`,
    );
  if (input.source && input.source !== "all")
    where.push(`j.source_id=${add(input.source)}::uuid`);
  if (input.matched)
    where.push(
      `EXISTS(SELECT 1 FROM monitor_matches selected_match JOIN monitors selected_monitor ON selected_monitor.id=selected_match.monitor_id WHERE selected_match.job_id=j.id AND selected_monitor.user_id=$1 AND selected_monitor.enabled)`,
    );
  if (input.location)
    where.push(`j.location ILIKE ${add(`%${input.location}%`)}`);
  if (input.mode === "remote") where.push("j.remote");
  if (input.mode === "onsite")
    where.push(
      "NOT j.remote AND lower(j.title||' '||j.location) NOT LIKE '%hybrid%'",
    );
  if (input.mode === "hybrid")
    where.push(
      "lower(j.title||' '||j.location||' '||j.employment_type) LIKE '%hybrid%'",
    );
  values.push(input.limit + 1);
  const result = await client.query(
    `SELECT j.id,j.external_id AS "externalId",j.source_id AS "sourceId",s.name AS "sourceName",
      j.title,j.company,j.location,j.remote,j.employment_type AS "employmentType",j.salary,j.tags,
      ''::text AS description,j.source_image_url AS "sourceImageUrl",j.url,j.published_at AS "publishedAt",
      j.first_seen_at AS "firstSeenAt",j.last_seen_at AS "lastSeenAt",j.active,
      COALESCE(personal_state.status,'new') AS status,(personal_state.reviewed_at IS NOT NULL) AS reviewed,
      COALESCE(personal_state.application_note,'') AS "applicationNote",personal_state.applied_at AS "appliedAt",
      COALESCE((SELECT array_agg(mm.monitor_id::text) FROM monitor_matches mm JOIN monitors m ON m.id=mm.monitor_id
        WHERE mm.job_id=j.id AND m.enabled AND m.user_id=$1),ARRAY[]::text[]) AS "matchedMonitors"
     FROM jobs j JOIN sources s ON s.id=j.source_id
     LEFT JOIN job_user_states personal_state ON personal_state.job_id=j.id AND personal_state.user_id=$1
     WHERE ${where.join(" AND ")}
     ORDER BY COALESCE(j.published_at,j.first_seen_at) DESC,j.id DESC LIMIT $${values.length}`,
    values,
  );
  const hasMore = result.rows.length > input.limit;
  const items = result.rows.slice(0, input.limit);
  const last = items.at(-1);
  return {
    items,
    nextCursor:
      hasMore && last
        ? encodeCursor({
            at: last.publishedAt || last.firstSeenAt,
            id: last.id,
          })
        : null,
  };
}

export async function workspaceSummary(client: PoolClient, user: AuthUser) {
  const [counts, latest] = await Promise.all([
    client.query(
      `SELECT
      (SELECT count(*)::int FROM monitors WHERE user_id=$1 AND enabled) AS monitors,
      (SELECT count(*)::int FROM job_user_states WHERE user_id=$1 AND status='saved') AS saved,
      (SELECT count(*)::int FROM job_user_states WHERE user_id=$1 AND status='applied') AS applied,
      (SELECT count(DISTINCT mm.job_id)::int FROM monitor_matches mm JOIN monitors m ON m.id=mm.monitor_id WHERE m.user_id=$1 AND m.enabled) AS matched`,
      [user.id],
    ),
    client.query(
      "SELECT max(last_synced_at) AS latest FROM sources WHERE enabled",
    ),
  ]);
  return {
    user,
    counts: counts.rows[0],
    latestCollectionAt: latest.rows[0]?.latest || null,
  };
}

export async function listMonitors(client: PoolClient, userId: string) {
  return (
    await client.query(
      `${monitorSelect} WHERE user_id=$1 ORDER BY created_at`,
      [userId],
    )
  ).rows;
}

export async function listSources(client: PoolClient) {
  return (await client.query(`${sourceSelect} ORDER BY name`)).rows;
}

export async function listRuns(client: PoolClient, limit = 50) {
  return (
    await client.query(
      `SELECT r.id,s.name AS "sourceName",r.started_at AS "startedAt",r.finished_at AS "finishedAt",
    r.status,r.fetched,r.added,r.error FROM sync_runs r JOIN sources s ON s.id=r.source_id
    ORDER BY r.started_at DESC LIMIT $1`,
      [limit],
    )
  ).rows;
}

export async function listRunJobs(
  client: PoolClient,
  userId: string,
  runId: string,
  input: {
    limit: number;
    cursor: { at: string; id: string } | null;
    onlyNew: boolean;
  },
) {
  const values: unknown[] = [runId, userId];
  const where = ["rj.run_id=$1"];
  if (input.onlyNew) where.push("rj.is_new");
  if (input.cursor) {
    values.push(input.cursor.at, input.cursor.id);
    where.push(
      `(COALESCE(j.published_at,j.first_seen_at),j.id)<($3::timestamptz,$4::uuid)`,
    );
  }
  values.push(input.limit + 1);
  const result = await client.query(
    `SELECT j.id,j.external_id AS "externalId",j.source_id AS "sourceId",s.name AS "sourceName",
       j.title,j.company,j.location,j.remote,j.employment_type AS "employmentType",j.salary,j.tags,
       ''::text AS description,j.source_image_url AS "sourceImageUrl",j.url,j.published_at AS "publishedAt",
       j.first_seen_at AS "firstSeenAt",j.last_seen_at AS "lastSeenAt",j.active,rj.is_new AS "isNew",
       COALESCE(personal_state.status,'new') AS status,(personal_state.reviewed_at IS NOT NULL) AS reviewed,
       COALESCE(personal_state.application_note,'') AS "applicationNote",personal_state.applied_at AS "appliedAt",
       COALESCE((SELECT array_agg(mm.monitor_id::text) FROM monitor_matches mm JOIN monitors m ON m.id=mm.monitor_id
         WHERE mm.job_id=j.id AND m.enabled AND m.user_id=$2),ARRAY[]::text[]) AS "matchedMonitors"
       FROM sync_run_jobs rj JOIN jobs j ON j.id=rj.job_id JOIN sources s ON s.id=j.source_id
       LEFT JOIN job_user_states personal_state ON personal_state.job_id=j.id AND personal_state.user_id=$2
      WHERE ${where.join(" AND ")}
      ORDER BY COALESCE(j.published_at,j.first_seen_at) DESC,j.id DESC
      LIMIT $${values.length}`,
    values,
  );
  const hasMore = result.rows.length > input.limit;
  const items = result.rows.slice(0, input.limit);
  const last = items.at(-1);
  return {
    items,
    nextCursor:
      hasMore && last
        ? encodeCursor({
            at: last.publishedAt || last.firstSeenAt,
            id: last.id,
          })
        : null,
  };
}
