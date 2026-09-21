INSERT INTO sync_run_jobs(run_id, job_id, is_new)
SELECT run.id, job.id,
       job.first_seen_at >= run.started_at
       AND job.first_seen_at <= COALESCE(run.finished_at, run.started_at) + interval '1 minute'
FROM sync_runs run
JOIN jobs job ON job.source_id=run.source_id
  AND job.last_seen_at >= run.started_at
  AND job.last_seen_at <= COALESCE(run.finished_at, run.started_at) + interval '1 minute'
WHERE run.status='success'
ON CONFLICT(run_id, job_id) DO UPDATE
SET is_new=sync_run_jobs.is_new OR excluded.is_new;
