import { z } from "zod";
import { db } from "../db";

export async function setJobStatus(
  userId: string,
  inputId: unknown,
  data: unknown,
) {
  const id = z.string().uuid().parse(inputId);
  const status = z.enum(["new", "saved", "applied", "archived"]).parse(data);
  await db().query(
    `INSERT INTO job_user_states(user_id,job_id,status,reviewed_at,applied_at)
         VALUES($1,$2,$3,now(),CASE WHEN $3='applied' THEN now() ELSE NULL END)
         ON CONFLICT(user_id,job_id) DO UPDATE
         SET status=excluded.status,reviewed_at=COALESCE(job_user_states.reviewed_at,now()),
             applied_at=CASE WHEN excluded.status='applied' THEN COALESCE(job_user_states.applied_at,now()) ELSE job_user_states.applied_at END,
             updated_at=now()`,
    [userId, id, status],
  );
}

export async function setJobNote(
  userId: string,
  inputId: unknown,
  data: unknown,
) {
  const id = z.string().uuid().parse(inputId);
  const note = z.string().trim().max(2000).parse(data);
  await db().query(
    `INSERT INTO job_user_states(user_id,job_id,application_note) VALUES($1,$2,$3)
         ON CONFLICT(user_id,job_id) DO UPDATE SET application_note=excluded.application_note,updated_at=now()`,
    [userId, id, note],
  );
}

export async function markJobReviewed(userId: string, inputId: unknown) {
  const id = z.string().uuid().parse(inputId);
  await db().query(
    `INSERT INTO job_user_states(user_id,job_id,status,reviewed_at)
         VALUES($1,$2,'new',now())
         ON CONFLICT(user_id,job_id) DO UPDATE SET reviewed_at=now(),updated_at=now()`,
    [userId, id],
  );
}

export async function canAccessJob(
  userId: string,
  jobId: string,
  role: string,
) {
  const result = await db().query(
    `SELECT 1 FROM jobs j
          WHERE j.id=$2 AND (
            $3::text='owner'
            OR EXISTS (SELECT 1 FROM job_user_states state WHERE state.job_id=j.id AND state.user_id=$1)
            OR EXISTS (
              SELECT 1 FROM monitor_matches match
              JOIN monitors monitor ON monitor.id=match.monitor_id
              WHERE match.job_id=j.id AND monitor.user_id=$1 AND monitor.enabled
            )
          )`,
    [userId, jobId, role],
  );

  return Boolean(result.rowCount);
}
