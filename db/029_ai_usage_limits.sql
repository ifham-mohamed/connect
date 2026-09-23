CREATE TABLE IF NOT EXISTS ai_usage_policy (
  singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
  member_daily_job_analysis_limit INTEGER NOT NULL DEFAULT 5
    CHECK (member_daily_job_analysis_limit BETWEEN 1 AND 100),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO ai_usage_policy(singleton,member_daily_job_analysis_limit)
VALUES(true,5)
ON CONFLICT(singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS ai_job_analysis_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('reserved','succeeded','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ai_job_analysis_usage_user_day_idx
  ON ai_job_analysis_usage(user_id,usage_date,status);
CREATE INDEX IF NOT EXISTS ai_job_analysis_usage_pending_idx
  ON ai_job_analysis_usage(created_at)
  WHERE status='reserved';
