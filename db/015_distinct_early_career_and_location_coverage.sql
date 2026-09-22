-- The earlier combined bucket cannot reveal whether a migrated user originally
-- selected Internship or Entry. Entry is the safer default because it covers
-- the broader junior, associate, and graduate intent; users can switch back to
-- Internship from their preference profile.
UPDATE users
SET preferences=jsonb_set(preferences,'{experience}','"entry"'::jsonb,true)
WHERE preferences->>'experience'='early';

WITH signals AS (
  SELECT
    ARRAY['intern','internship','trainee','apprentice','apprenticeship','placement']::text[] AS internship,
    ARRAY[
      'junior','jr','jr.','associate','graduate','entry level','entry-level',
      'level 1','level i'
    ]::text[] AS entry,
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
          WHERE NOT existing=ANY(signals.internship||signals.entry||signals.mid||signals.senior)
        ) || CASE u.preferences->>'experience'
          WHEN 'internship' THEN signals.entry||signals.mid||signals.senior
          WHEN 'entry' THEN signals.internship||signals.mid||signals.senior
          WHEN 'mid' THEN signals.internship||signals.entry||signals.senior
          WHEN 'senior' THEN signals.internship||signals.entry||signals.mid
          WHEN 'other' THEN signals.internship||signals.entry||signals.mid||signals.senior
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
  IF preference = 'early' THEN normalized := 'entry'; END IF;

  -- Senior wins compound titles such as "Senior Associate Engineer".
  IF EXISTS (
    SELECT 1 FROM unnest(ARRAY[
      'senior','sr','sr.','lead','principal','staff','manager','architect','head',
      'director','level 3','level iii','level 4','level iv','level 5'
    ]) signal WHERE jobradar_keyword_match(haystack, signal)
  ) THEN
    detected := 'senior';
  ELSIF EXISTS (
    SELECT 1 FROM unnest(ARRAY[
      'intern','internship','trainee','apprentice','apprenticeship','placement'
    ]) signal WHERE jobradar_keyword_match(haystack, signal)
  ) THEN
    detected := 'internship';
  ELSIF EXISTS (
    SELECT 1 FROM unnest(ARRAY[
      'junior','jr','jr.','associate','graduate','entry level','entry-level',
      'level 1','level i'
    ]) signal WHERE jobradar_keyword_match(haystack, signal)
  ) THEN
    detected := 'entry';
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
