CREATE TABLE IF NOT EXISTS jev_rollout_rules (
  source_kind TEXT NOT NULL,
  field TEXT NOT NULL CHECK (field IN ('content_quality','technology_relevance','work_arrangement','career_stage')),
  min_confidence REAL NOT NULL CHECK (min_confidence >= 0.5 AND min_confidence <= 1),
  enabled BOOLEAN NOT NULL DEFAULT false,
  rationale TEXT NOT NULL DEFAULT '' CHECK (NOT enabled OR length(btrim(rationale)) BETWEEN 20 AND 1000),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (source_kind, field)
);

CREATE TABLE IF NOT EXISTS jev_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  field TEXT NOT NULL CHECK (field IN ('career_stage','work_arrangement','content_quality','technology_relevance')),
  value TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (length(btrim(reason)) BETWEEN 8 AND 500),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (field='career_stage' AND value IN ('internship','entry','mid','senior','other')) OR
    (field='work_arrangement' AND value IN ('onsite','hybrid','remote','unclear')) OR
    (field='content_quality' AND value IN ('usable','sparse','malformed','non_job')) OR
    (field='technology_relevance' AND value IN ('technology','non_technology'))
  )
);
CREATE INDEX IF NOT EXISTS jev_corrections_latest_idx ON jev_corrections(job_id,field,created_at DESC,id DESC);

CREATE OR REPLACE FUNCTION jobradar_assisted_match(
  target_job UUID, source_kind TEXT, title_tags TEXT, location_text TEXT,
  is_remote BOOLEAN, accepted_modes TEXT[], preference TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE
  profile job_intelligence_profiles%ROWTYPE;
  effective_stage TEXT := jobradar_detect_experience(title_tags);
  effective_mode TEXT := CASE
    WHEN is_remote OR jobradar_keyword_match(title_tags||' '||location_text,'remote')
      OR jobradar_keyword_match(title_tags||' '||location_text,'worldwide') THEN 'remote'
    WHEN jobradar_keyword_match(title_tags||' '||location_text,'hybrid') THEN 'hybrid'
    ELSE 'onsite' END;
  mode_explicit BOOLEAN := is_remote OR jobradar_keyword_match(title_tags||' '||location_text,'remote')
    OR jobradar_keyword_match(title_tags||' '||location_text,'worldwide')
    OR jobradar_keyword_match(title_tags||' '||location_text,'hybrid')
    OR jobradar_keyword_match(title_tags||' '||location_text,'onsite')
    OR jobradar_keyword_match(title_tags||' '||location_text,'on-site');
  rule jev_rollout_rules%ROWTYPE;
  correction TEXT;
BEGIN
  SELECT p.* INTO profile FROM job_intelligence_profiles p
  JOIN job_intelligence_queue q ON q.job_id=p.job_id AND q.content_hash=p.content_hash
    AND q.question_set_version='job-classification-v1' AND q.status='succeeded'
  WHERE p.job_id=target_job AND p.needs_review=false
    AND NOT EXISTS (
      SELECT 1 FROM job_intelligence_queue newer
      WHERE newer.job_id=p.job_id AND newer.question_set_version=q.question_set_version
        AND newer.created_at>q.created_at
    )
  LIMIT 1;

  IF profile.job_id IS NOT NULL THEN
    SELECT * INTO rule FROM jev_rollout_rules r WHERE r.source_kind=jobradar_assisted_match.source_kind AND field='content_quality' AND enabled;
    IF FOUND AND profile.content_quality='non_job' AND (profile.confidence->>'contentQuality')::real >= rule.min_confidence THEN RETURN false; END IF;
    SELECT * INTO rule FROM jev_rollout_rules r WHERE r.source_kind=jobradar_assisted_match.source_kind AND field='technology_relevance' AND enabled;
    IF FOUND AND profile.technology_relevance <= 1-rule.min_confidence THEN RETURN false; END IF;
    IF NOT mode_explicit THEN
      SELECT * INTO rule FROM jev_rollout_rules r WHERE r.source_kind=jobradar_assisted_match.source_kind AND field='work_arrangement' AND enabled;
      IF FOUND AND profile.work_arrangement<>'unclear' AND (profile.confidence->>'workArrangement')::real >= rule.min_confidence THEN effective_mode := profile.work_arrangement; END IF;
    END IF;
    IF effective_stage='other' THEN
      SELECT * INTO rule FROM jev_rollout_rules r WHERE r.source_kind=jobradar_assisted_match.source_kind AND field='career_stage' AND enabled;
      IF FOUND AND profile.career_stage<>'other' AND (profile.confidence->>'careerStage')::real >= rule.min_confidence THEN effective_stage := profile.career_stage; END IF;
    END IF;
  END IF;

  IF effective_stage='other' THEN
    SELECT c.value INTO correction FROM jev_corrections c
    JOIN jev_rollout_rules r ON r.source_kind=jobradar_assisted_match.source_kind AND r.field=c.field AND r.enabled
    WHERE c.job_id=target_job AND c.field='career_stage'
    ORDER BY c.created_at DESC,c.id DESC LIMIT 1;
    IF correction IS NOT NULL THEN effective_stage := correction; END IF;
  END IF;
  RETURN effective_mode=ANY(accepted_modes)
    AND (preference IS NULL OR preference='' OR effective_stage=preference);
END;
$$;
