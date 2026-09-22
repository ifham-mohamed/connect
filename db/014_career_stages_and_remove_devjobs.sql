DELETE FROM sync_runs
WHERE source_id IN (SELECT id FROM sources WHERE kind='devjobs');

DELETE FROM jobs
WHERE source_id IN (SELECT id FROM sources WHERE kind='devjobs');

DELETE FROM sources WHERE kind='devjobs';

ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_kind_check;
ALTER TABLE sources ADD CONSTRAINT sources_kind_check CHECK (
  kind IN (
    'itpro','topjobs','xpressjobs','jobeka','rooster','neojobs','jobster',
    'remotive','arbeitnow','greenhouse','lever'
  )
);

UPDATE users
SET preferences=jsonb_set(preferences,'{experience}','"early"'::jsonb,true)
WHERE preferences->>'experience' IN ('internship','entry');

WITH signals AS (
  SELECT
    ARRAY[
      'intern','internship','trainee','apprentice','apprenticeship','placement',
      'junior','jr','jr.','associate','graduate','entry level','entry-level',
      'level 1','level i'
    ]::text[] AS early,
    ARRAY['mid level','mid-level','intermediate','level 2','level ii']::text[] AS mid,
    ARRAY[
      'senior','sr','sr.','lead','principal','staff','manager','architect','head',
      'director','level 3','level iii','level 4','level iv','level 5'
    ]::text[] AS senior
), cleaned AS (
  SELECT m.id,
    ARRAY(
      SELECT DISTINCT value
      FROM unnest(
        ARRAY(
          SELECT existing
          FROM unnest(m.excluded_keywords) existing
          WHERE NOT existing=ANY(signals.early||signals.mid||signals.senior)
        ) || CASE u.preferences->>'experience'
          WHEN 'early' THEN signals.mid||signals.senior
          WHEN 'mid' THEN signals.early||signals.senior
          WHEN 'senior' THEN signals.early||signals.mid
          WHEN 'other' THEN signals.early||signals.mid||signals.senior
          ELSE ARRAY[]::text[]
        END
      ) value
      ORDER BY value
    ) AS exclusions
  FROM monitors m
  JOIN users u ON u.id=m.user_id
  CROSS JOIN signals
)
UPDATE monitors
SET excluded_keywords=cleaned.exclusions
FROM cleaned
WHERE monitors.id=cleaned.id;

CREATE OR REPLACE FUNCTION jobradar_experience_match(haystack TEXT, preference TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  normalized TEXT := preference;
  detected TEXT := 'other';
BEGIN
  IF preference IS NULL OR preference = '' THEN RETURN true; END IF;
  IF preference IN ('internship','entry') THEN normalized := 'early'; END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(ARRAY[
      'senior','sr','sr.','lead','principal','staff','manager','architect','head',
      'director','level 3','level iii','level 4','level iv','level 5'
    ]) signal WHERE jobradar_keyword_match(haystack, signal)
  ) THEN
    detected := 'senior';
  ELSIF EXISTS (
    SELECT 1 FROM unnest(ARRAY[
      'intern','internship','trainee','apprentice','apprenticeship','placement',
      'junior','jr','jr.','associate','graduate','entry level','entry-level',
      'level 1','level i'
    ]) signal WHERE jobradar_keyword_match(haystack, signal)
  ) THEN
    detected := 'early';
  ELSIF EXISTS (
    SELECT 1 FROM unnest(ARRAY[
      'mid level','mid-level','intermediate','level 2','level ii'
    ]) signal WHERE jobradar_keyword_match(haystack, signal)
  ) THEN
    detected := 'mid';
  END IF;

  RETURN detected = normalized;
END;
$$;

DELETE FROM monitor_matches;
INSERT INTO monitor_matches(monitor_id,job_id)
SELECT m.id,j.id
FROM monitors m CROSS JOIN jobs j
WHERE m.enabled
  AND (NOT m.remote_only OR j.remote)
  AND (
    m.location=''
    OR strpos(lower(j.location),lower(m.location))>0
    OR (
      lower(m.location)='sri lanka'
      AND lower(j.location) ~ '\m(colombo|kandy|galle|jaffna|gampaha|negombo|matara|kurunegala)\M'
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
