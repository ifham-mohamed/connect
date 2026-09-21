CREATE TABLE IF NOT EXISTS job_user_states (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','saved','applied','archived')),
  reviewed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS job_user_states_user_status_idx
  ON job_user_states(user_id, status, updated_at DESC);

INSERT INTO job_user_states(user_id, job_id, status, reviewed_at)
SELECT first_account.id, jobs.id, jobs.status, now()
FROM jobs
CROSS JOIN LATERAL (
  SELECT id FROM users ORDER BY (role = 'owner') DESC, created_at, id LIMIT 1
) AS first_account
WHERE jobs.status <> 'new'
ON CONFLICT (user_id, job_id) DO NOTHING;
