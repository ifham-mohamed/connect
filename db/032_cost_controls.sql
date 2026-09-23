UPDATE ai_workspace_budget
SET monthly_request_limit=500,monthly_token_limit=1000000,updated_at=now()
WHERE singleton AND monthly_request_limit=0 AND monthly_token_limit=0;

CREATE OR REPLACE FUNCTION jobradar_apply_retention()
RETURNS TABLE(deleted_run_jobs BIGINT,deleted_runs BIGINT,deleted_limits BIGINT,deleted_events BIGINT)
LANGUAGE plpgsql AS $$
DECLARE cutoff TIMESTAMPTZ := now()-interval '90 days';
BEGIN
  INSERT INTO source_daily_stats(day,source_id,runs,fetched,added,failed)
  SELECT timezone('Asia/Colombo',r.started_at)::date,r.source_id,count(*)::int,
    sum(r.fetched)::int,sum(r.added)::int,count(*) FILTER(WHERE r.status='failed')::int
  FROM sync_runs r WHERE r.started_at<cutoff
  GROUP BY 1,2
  ON CONFLICT(day,source_id) DO UPDATE SET
    runs=GREATEST(source_daily_stats.runs,excluded.runs),
    fetched=GREATEST(source_daily_stats.fetched,excluded.fetched),
    added=GREATEST(source_daily_stats.added,excluded.added),
    failed=GREATEST(source_daily_stats.failed,excluded.failed);

  DELETE FROM sync_run_jobs WHERE run_id IN(SELECT id FROM sync_runs WHERE started_at<cutoff);
  GET DIAGNOSTICS deleted_run_jobs=ROW_COUNT;
  DELETE FROM sync_runs WHERE started_at<cutoff;
  GET DIAGNOSTICS deleted_runs=ROW_COUNT;
  DELETE FROM request_rate_limits WHERE reset_at<cutoff;
  GET DIAGNOSTICS deleted_limits=ROW_COUNT;
  DELETE FROM security_events WHERE created_at<cutoff AND severity IN('info','warning');
  GET DIAGNOSTICS deleted_events=ROW_COUNT;
  RETURN NEXT;
END;
$$;
