CREATE TABLE IF NOT EXISTS candidate_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  skills TEXT[] NOT NULL DEFAULT '{}',
  evidence_summary TEXT NOT NULL DEFAULT '',
  consented_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (cardinality(skills) <= 30 AND length(evidence_summary) <= 2000)
);

ALTER TABLE job_user_states ADD COLUMN IF NOT EXISTS application_note TEXT NOT NULL DEFAULT '';
ALTER TABLE job_user_states ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;
ALTER TABLE job_user_states ADD CONSTRAINT job_user_states_note_length CHECK (length(application_note) <= 2000);
UPDATE job_user_states SET applied_at=updated_at WHERE status='applied' AND applied_at IS NULL;
