CREATE OR REPLACE FUNCTION jobradar_stage_compatible(detected TEXT, preference TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT preference IS NULL
    OR preference=''
    OR detected=preference
    OR (detected='other' AND preference IN ('entry','mid','senior'));
$$;

CREATE OR REPLACE FUNCTION jobradar_experience_match(haystack TEXT, preference TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT jobradar_stage_compatible(
    jobradar_detect_experience(haystack),
    preference
  );
$$;

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

  SELECT * INTO rule FROM jev_rollout_rules r WHERE r.source_kind=jobradar_assisted_match.source_kind AND field='content_quality' AND enabled;
  IF FOUND THEN
    SELECT c.value INTO correction FROM jev_corrections c WHERE c.job_id=target_job AND c.field='content_quality' ORDER BY c.created_at DESC,c.id DESC LIMIT 1;
    IF correction='non_job' THEN RETURN false; END IF;
    IF correction IS NULL AND profile.job_id IS NOT NULL AND profile.content_quality='non_job'
      AND (profile.confidence->>'contentQuality')::real >= rule.min_confidence THEN RETURN false; END IF;
  END IF;

  correction := NULL;
  SELECT * INTO rule FROM jev_rollout_rules r WHERE r.source_kind=jobradar_assisted_match.source_kind AND field='technology_relevance' AND enabled;
  IF FOUND THEN
    SELECT c.value INTO correction FROM jev_corrections c WHERE c.job_id=target_job AND c.field='technology_relevance' ORDER BY c.created_at DESC,c.id DESC LIMIT 1;
    IF correction='non_technology' THEN RETURN false; END IF;
    IF correction IS NULL AND profile.job_id IS NOT NULL AND profile.technology_relevance <= 1-rule.min_confidence THEN RETURN false; END IF;
  END IF;

  IF NOT mode_explicit THEN
    correction := NULL;
    SELECT * INTO rule FROM jev_rollout_rules r WHERE r.source_kind=jobradar_assisted_match.source_kind AND field='work_arrangement' AND enabled;
    IF FOUND THEN
      SELECT c.value INTO correction FROM jev_corrections c WHERE c.job_id=target_job AND c.field='work_arrangement' ORDER BY c.created_at DESC,c.id DESC LIMIT 1;
      IF correction IS NOT NULL AND correction<>'unclear' THEN effective_mode := correction;
      ELSIF correction IS NULL AND profile.job_id IS NOT NULL AND profile.work_arrangement<>'unclear'
        AND (profile.confidence->>'workArrangement')::real >= rule.min_confidence THEN effective_mode := profile.work_arrangement; END IF;
    END IF;
  END IF;

  IF effective_stage='other' THEN
    correction := NULL;
    SELECT * INTO rule FROM jev_rollout_rules r WHERE r.source_kind=jobradar_assisted_match.source_kind AND field='career_stage' AND enabled;
    IF FOUND THEN
      SELECT c.value INTO correction FROM jev_corrections c WHERE c.job_id=target_job AND c.field='career_stage' ORDER BY c.created_at DESC,c.id DESC LIMIT 1;
      IF correction IS NOT NULL THEN effective_stage := correction;
      ELSIF profile.job_id IS NOT NULL AND profile.career_stage<>'other'
        AND (profile.confidence->>'careerStage')::real >= rule.min_confidence THEN effective_stage := profile.career_stage; END IF;
    END IF;
  END IF;
  RETURN effective_mode=ANY(accepted_modes)
    AND jobradar_stage_compatible(effective_stage,preference);
END;
$$;

DELETE FROM monitor_matches;
INSERT INTO monitor_matches(monitor_id,job_id)
SELECT m.id,j.id
FROM monitors m CROSS JOIN jobs j
WHERE m.enabled
  AND (NOT m.remote_only OR j.remote)
  AND jobradar_work_mode_match(
    j.remote,
    j.title||' '||array_to_string(j.tags,' ')||' '||j.location,
    m.work_modes
  )
  AND (
    m.location=''
    OR strpos(lower(j.location),lower(m.location))>0
    OR (
      lower(m.location)='sri lanka'
      AND lower(j.location) ~ '\m(sri lanka|western province|central province|southern province|northern province|eastern province|north western province|north central province|uva province|sabaragamuwa province|colombo|kandy|galle|jaffna|gampaha|negombo|matara|kurunegala|anuradhapura|polonnaruwa|badulla|ratnapura|trincomalee|batticaloa|kalutara|hambantota|kilinochchi|mannar|mullaitivu|vavuniya|puttalam|matale|nuwara eliya|kegalle|monaragala|ampara)\M'
    )
  )
  AND jobradar_experience_match(
    j.title||' '||array_to_string(j.tags,' '),
    COALESCE((SELECT u.preferences->>'experience' FROM users u WHERE u.id=m.user_id), '')
  )
  AND EXISTS (
    SELECT 1 FROM unnest(m.keywords) keyword
    WHERE jobradar_keyword_match(j.title||' '||array_to_string(j.tags,' '),keyword)
  )
  AND NOT EXISTS (
    SELECT 1 FROM unnest(m.excluded_keywords) keyword
    WHERE jobradar_keyword_match(j.title||' '||array_to_string(j.tags,' '),keyword)
  )
ON CONFLICT DO NOTHING;

UPDATE data_revisions
SET version=version+1,updated_at=now()
WHERE scope='jobs' AND user_id IS NULL;
