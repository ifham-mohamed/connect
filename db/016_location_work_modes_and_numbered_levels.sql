ALTER TABLE monitors
ADD COLUMN IF NOT EXISTS work_modes TEXT[] NOT NULL
DEFAULT ARRAY['onsite','hybrid','remote']::text[];

UPDATE monitors
SET work_modes=ARRAY['remote']::text[]
WHERE remote_only;

ALTER TABLE monitors DROP CONSTRAINT IF EXISTS monitors_work_modes_check;
ALTER TABLE monitors ADD CONSTRAINT monitors_work_modes_check CHECK (
  cardinality(work_modes)>0
  AND work_modes <@ ARRAY['onsite','hybrid','remote']::text[]
);

CREATE OR REPLACE FUNCTION jobradar_work_mode_match(
  is_remote BOOLEAN,
  haystack TEXT,
  accepted TEXT[]
) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE detected TEXT := 'onsite';
BEGIN
  IF is_remote OR jobradar_keyword_match(haystack,'remote') OR jobradar_keyword_match(haystack,'worldwide') THEN
    detected := 'remote';
  ELSIF jobradar_keyword_match(haystack,'hybrid') THEN
    detected := 'hybrid';
  END IF;
  RETURN detected=ANY(accepted);
END;
$$;

CREATE OR REPLACE FUNCTION jobradar_experience_match(haystack TEXT, preference TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  detected TEXT := 'other';
  normalized TEXT := lower(haystack);
BEGIN
  IF preference IS NULL OR preference = '' THEN RETURN true; END IF;

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
  ELSIF normalized ~ '(\([[:space:]]*(3|iii)[[:space:]]*\)|\m(level|grade|l)[[:space:]]*[-:]?[[:space:]]*(3|iii)\M|\m(engineer|developer|analyst|specialist|designer|consultant)[[:space:]]+(3|iii)\M)' THEN
    detected := 'senior';
  ELSIF normalized ~ '(\([[:space:]]*(2|ii)[[:space:]]*\)|\m(level|grade|l)[[:space:]]*[-:]?[[:space:]]*(2|ii)\M|\m(engineer|developer|analyst|specialist|designer|consultant)[[:space:]]+(2|ii)\M)' THEN
    detected := 'mid';
  ELSIF normalized ~ '(\([[:space:]]*(1|i)[[:space:]]*\)|\m(level|grade|l)[[:space:]]*[-:]?[[:space:]]*(1|i)\M|\m(engineer|developer|analyst|specialist|designer|consultant)[[:space:]]+(1|i)\M)' THEN
    detected := 'entry';
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

  RETURN detected=preference;
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
