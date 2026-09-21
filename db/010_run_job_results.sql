CREATE TABLE IF NOT EXISTS sync_run_jobs (
  run_id UUID NOT NULL REFERENCES sync_runs(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  is_new BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (run_id, job_id)
);

CREATE INDEX IF NOT EXISTS sync_run_jobs_job_idx ON sync_run_jobs(job_id);

INSERT INTO sync_run_jobs(run_id, job_id, is_new)
SELECT run.id, job.id, true
FROM sync_runs run
JOIN jobs job ON job.source_id=run.source_id
  AND job.first_seen_at >= run.started_at
  AND job.first_seen_at <= COALESCE(run.finished_at, run.started_at) + interval '1 minute'
WHERE run.status='success'
ON CONFLICT DO NOTHING;
