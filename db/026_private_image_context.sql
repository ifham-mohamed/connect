ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS source_image_url TEXT NOT NULL DEFAULT '';

ALTER TABLE job_user_states
  ADD COLUMN IF NOT EXISTS extracted_description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS extracted_description_confidence REAL,
  ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMPTZ;

ALTER TABLE job_user_states
  DROP CONSTRAINT IF EXISTS job_user_states_extracted_description_confidence_check;

ALTER TABLE job_user_states
  ADD CONSTRAINT job_user_states_extracted_description_confidence_check
  CHECK (
    extracted_description_confidence IS NULL OR
    extracted_description_confidence BETWEEN 0 AND 100
  );
