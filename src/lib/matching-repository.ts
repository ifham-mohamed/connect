import type { PoolClient } from "pg";

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
