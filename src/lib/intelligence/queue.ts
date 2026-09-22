import type { Pool, PoolClient } from "pg";
import type { SourceKind } from "../types";
import {
  buildJobDecisionState,
  jobDecisionStateHash,
  type JobDecisionState,
} from "./job-state";
import { JOB_CLASSIFICATION_VERSION } from "../jev/questions/job-classification-v1";

type Queryable = Pick<Pool | PoolClient, "query">;

type IntelligenceJobRow = {
  id: string;
  sourceKind: SourceKind;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  employmentType: string;
  tags: string[];
  description: string;
};

const intelligenceJobSelect = `SELECT j.id, s.kind AS "sourceKind", j.title, j.company, j.location,
  j.remote, j.employment_type AS "employmentType", j.tags, j.description
  FROM jobs j JOIN sources s ON s.id=j.source_id`;

export function stateFromIntelligenceJob(row: IntelligenceJobRow) {
  return buildJobDecisionState(row);
}

export async function loadIntelligenceJob(queryable: Queryable, jobId: string) {
  const result = await queryable.query<IntelligenceJobRow>(
    `${intelligenceJobSelect} WHERE j.id=$1 LIMIT 1`,
    [jobId],
  );
  const row = result.rows[0];
  return row ? { row, state: stateFromIntelligenceJob(row) } : null;
}

export async function queueJobsForIntelligence(
  queryable: Queryable,
  jobIds: string[],
) {
  if (!jobIds.length) return 0;
  const jobs = await queryable.query<IntelligenceJobRow>(
    `${intelligenceJobSelect} WHERE j.id=ANY($1::uuid[]) AND j.active`,
    [jobIds],
  );
  let queued = 0;
  for (const job of jobs.rows) {
    const hash = jobDecisionStateHash(stateFromIntelligenceJob(job));
    await queryable.query(
      `UPDATE job_intelligence_queue
          SET status='stale',locked_at=NULL,locked_by=NULL,updated_at=now()
        WHERE job_id=$1 AND content_hash<>$2
          AND status IN ('pending','processing','retrying')`,
      [job.id, hash],
    );
    const inserted = await queryable.query(
      `INSERT INTO job_intelligence_queue(job_id,content_hash,question_set_version)
       VALUES($1,$2,$3)
       ON CONFLICT(job_id,content_hash,question_set_version) DO NOTHING
       RETURNING id`,
      [job.id, hash, JOB_CLASSIFICATION_VERSION],
    );
    queued += inserted.rowCount || 0;
  }
  return queued;
}

export async function backfillJobIntelligence(
  queryable: Queryable,
  limit: number,
) {
  const result = await queryable.query<{ id: string }>(
    `SELECT j.id FROM jobs j
      WHERE j.active
      ORDER BY COALESCE(j.published_at,j.first_seen_at) DESC
      LIMIT $1`,
    [limit],
  );
  return queueJobsForIntelligence(
    queryable,
    result.rows.map((row) => row.id),
  );
}

export type ClaimedIntelligenceTask = {
  id: string;
  jobId: string;
  contentHash: string;
  questionSetVersion: string;
  attempts: number;
};

export async function claimIntelligenceTasks(
  client: Pick<PoolClient, "query">,
  workerId: string,
  limit: number,
) {
  await client.query("BEGIN");
  try {
    await client.query(
      `UPDATE job_intelligence_queue
          SET status='retrying',locked_at=NULL,locked_by=NULL,
              available_at=now(),last_error_code='lease_expired',updated_at=now()
        WHERE status='processing' AND locked_at<now()-interval '10 minutes'`,
    );
    const result = await client.query<ClaimedIntelligenceTask>(
      `WITH selected AS (
         SELECT id FROM job_intelligence_queue
          WHERE status IN ('pending','retrying') AND available_at<=now()
          ORDER BY available_at,created_at
          FOR UPDATE SKIP LOCKED LIMIT $1
       )
       UPDATE job_intelligence_queue queue
          SET status='processing',attempts=attempts+1,locked_at=now(),
              locked_by=$2,last_error_code=NULL,updated_at=now()
         FROM selected WHERE queue.id=selected.id
       RETURNING queue.id,queue.job_id AS "jobId",queue.content_hash AS "contentHash",
                 queue.question_set_version AS "questionSetVersion",queue.attempts`,
      [limit, workerId],
    );
    await client.query("COMMIT");
    return result.rows;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function markIntelligenceTaskStale(
  queryable: Queryable,
  taskId: string,
) {
  await queryable.query(
    `UPDATE job_intelligence_queue SET status='stale',locked_at=NULL,locked_by=NULL,updated_at=now()
      WHERE id=$1 AND status='processing'`,
    [taskId],
  );
}

export async function retryOrDeadLetterTask(
  queryable: Queryable,
  task: ClaimedIntelligenceTask,
  errorCode: string,
  retryable: boolean,
  maxAttempts: number,
) {
  const retry = retryable && task.attempts < maxAttempts;
  const delayMs = Math.min(
    3_600_000,
    1_000 * 2 ** Math.max(0, task.attempts - 1),
  );
  await queryable.query(
    `UPDATE job_intelligence_queue
        SET status=$2,available_at=CASE WHEN $2='retrying' THEN now()+$3*interval '1 millisecond' ELSE available_at END,
            locked_at=NULL,locked_by=NULL,last_error_code=$4,updated_at=now()
      WHERE id=$1 AND status='processing'`,
    [task.id, retry ? "retrying" : "dead", delayMs, errorCode],
  );
  return retry ? "retrying" : "dead";
}

export async function currentTaskState(
  queryable: Queryable,
  task: ClaimedIntelligenceTask,
): Promise<JobDecisionState | null> {
  const loaded = await loadIntelligenceJob(queryable, task.jobId);
  if (!loaded || jobDecisionStateHash(loaded.state) !== task.contentHash)
    return null;
  return loaded.state;
}
