CREATE TABLE job_cv_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES candidate_cvs(user_id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  cv_revision INTEGER NOT NULL CHECK (cv_revision > 0),
  job_hash TEXT NOT NULL CHECK (job_hash ~ '^[a-f0-9]{64}$'),
  result JSONB NOT NULL,
  model_identifier TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id,job_id,cv_revision,job_hash)
);
CREATE INDEX job_cv_reviews_user_recent_idx ON job_cv_reviews(user_id,created_at DESC);
