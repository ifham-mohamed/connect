CREATE OR REPLACE FUNCTION jobradar_experience_match(haystack TEXT, preference TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  detected TEXT := '';
BEGIN
  IF preference IS NULL OR preference = '' THEN RETURN true; END IF;

  -- Prefer senior markers in compound titles such as "Senior Associate Engineer".
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

  -- Keep unlabelled roles because many source titles do not state seniority.
  RETURN detected = '' OR detected = preference;
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
