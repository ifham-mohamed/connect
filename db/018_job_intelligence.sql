CREATE OR REPLACE FUNCTION jobradar_detect_experience(haystack TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  detected TEXT := 'other';
  normalized TEXT := lower(haystack);
BEGIN
  IF EXISTS (
    SELECT 1 FROM unnest(ARRAY[
      'senior','sr','sr.','lead','principal','staff','manager','architect','head',
      'director','level 3','level iii','level 4','level iv','level 5'
    ]) signal WHERE jobradar_keyword_match(haystack, signal)
  ) THEN detected := 'senior';
  ELSIF EXISTS (
    SELECT 1 FROM unnest(ARRAY[
      'intern','internship','trainee','apprentice','apprenticeship','placement'
    ]) signal WHERE jobradar_keyword_match(haystack, signal)
  ) THEN detected := 'internship';
  ELSIF normalized ~ '(\([[:space:]]*(3|iii)[[:space:]]*\)|\m(level|grade|l)[[:space:]]*[-:]?[[:space:]]*(3|iii)\M|\m(engineer|developer|analyst|specialist|designer|consultant)[[:space:]]+(3|iii)\M)' THEN detected := 'senior';
  ELSIF normalized ~ '(\([[:space:]]*(2|ii)[[:space:]]*\)|\m(level|grade|l)[[:space:]]*[-:]?[[:space:]]*(2|ii)\M|\m(engineer|developer|analyst|specialist|designer|consultant)[[:space:]]+(2|ii)\M)' THEN detected := 'mid';
  ELSIF normalized ~ '(\([[:space:]]*(1|i)[[:space:]]*\)|\m(level|grade|l)[[:space:]]*[-:]?[[:space:]]*(1|i)\M|\m(engineer|developer|analyst|specialist|designer|consultant)[[:space:]]+(1|i)\M)' THEN detected := 'entry';
  ELSIF EXISTS (
    SELECT 1 FROM unnest(ARRAY[
      'junior','jr','jr.','associate','graduate','entry level','entry-level',
      'level 1','level i'
    ]) signal WHERE jobradar_keyword_match(haystack, signal)
  ) THEN detected := 'entry';
  ELSIF EXISTS (
    SELECT 1 FROM unnest(ARRAY[
      'mid level','mid-level','intermediate','level 2','level ii'
    ]) signal WHERE jobradar_keyword_match(haystack, signal)
  ) THEN detected := 'mid';
  END IF;
  RETURN detected;
END;
$$;

CREATE TABLE IF NOT EXISTS job_intelligence_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  question_set_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','retrying','succeeded','dead','stale')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, content_hash, question_set_version)
);

CREATE INDEX IF NOT EXISTS job_intelligence_queue_claim_idx
  ON job_intelligence_queue(status, available_at, created_at)
  WHERE status IN ('pending','retrying');
CREATE INDEX IF NOT EXISTS job_intelligence_queue_job_idx
  ON job_intelligence_queue(job_id, created_at DESC);

CREATE TABLE IF NOT EXISTS jev_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  queue_id UUID NOT NULL UNIQUE REFERENCES job_intelligence_queue(id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  state_hash TEXT NOT NULL CHECK (state_hash ~ '^[a-f0-9]{64}$'),
  question_set_version TEXT NOT NULL,
  model_identifier TEXT NOT NULL,
  response JSONB NOT NULL,
  policy_status TEXT NOT NULL CHECK (policy_status IN ('shadow_only','review')),
  policy_reasons TEXT[] NOT NULL DEFAULT '{}',
  latency_ms INTEGER NOT NULL CHECK (latency_ms >= 0),
  input_tokens INTEGER NOT NULL CHECK (input_tokens >= 0),
  output_tokens INTEGER NOT NULL CHECK (output_tokens >= 0),
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jev_evaluations_job_idx
  ON jev_evaluations(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS jev_evaluations_created_idx
  ON jev_evaluations(created_at DESC);

CREATE TABLE IF NOT EXISTS job_intelligence_profiles (
  job_id UUID PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
  evaluation_id UUID NOT NULL REFERENCES jev_evaluations(id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  role_family TEXT NOT NULL CHECK (role_family IN ('software','frontend','backend','full_stack','data','infrastructure','security','qa','design','product','support','other')),
  career_stage TEXT NOT NULL CHECK (career_stage IN ('internship','entry','mid','senior','other')),
  work_arrangement TEXT NOT NULL CHECK (work_arrangement IN ('onsite','hybrid','remote','unclear')),
  technology_relevance REAL NOT NULL CHECK (technology_relevance BETWEEN 0 AND 1),
  content_quality TEXT NOT NULL CHECK (content_quality IN ('usable','sparse','malformed','non_job')),
  confidence JSONB NOT NULL,
  policy_status TEXT NOT NULL CHECK (policy_status IN ('shadow_only','review')),
  needs_review BOOLEAN NOT NULL DEFAULT false,
  policy_version TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_intelligence_profiles_review_idx
  ON job_intelligence_profiles(needs_review, updated_at DESC);
