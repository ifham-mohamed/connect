CREATE TABLE IF NOT EXISTS job_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  description_hash TEXT NOT NULL CHECK (description_hash ~ '^[a-f0-9]{64}$'),
  start_offset INTEGER NOT NULL CHECK (start_offset >= 0),
  end_offset INTEGER NOT NULL CHECK (end_offset > start_offset),
  evidence TEXT NOT NULL CHECK (length(evidence) BETWEEN 10 AND 300),
  category TEXT NOT NULL CHECK (category IN ('skill','experience','education','responsibility','other')),
  importance TEXT NOT NULL CHECK (importance IN ('required','preferred','unclear')),
  group_kind TEXT NOT NULL CHECK (group_kind IN ('and','or','single')),
  confidence REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  model_identifier TEXT NOT NULL,
  question_set_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id,description_hash,start_offset,end_offset,question_set_version)
);
CREATE INDEX IF NOT EXISTS job_requirements_job_idx ON job_requirements(job_id,created_at DESC);
