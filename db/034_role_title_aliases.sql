CREATE OR REPLACE FUNCTION jobradar_keyword_match(haystack TEXT, keyword TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  escaped TEXT := '';
  letter TEXT;
  i INTEGER;
  normalized_haystack TEXT;
  normalized_keyword TEXT;
BEGIN
  normalized_haystack := lower(regexp_replace(COALESCE(haystack,''), '[-‐‑‒–—]+', ' ', 'g'));
  normalized_keyword := lower(regexp_replace(COALESCE(keyword,''), '[-‐‑‒–—]+', ' ', 'g'));

  normalized_haystack := regexp_replace(normalized_haystack, '\mfull[[:space:]]*stack\M', 'full stack', 'g');
  normalized_keyword := regexp_replace(normalized_keyword, '\mfull[[:space:]]*stack\M', 'full stack', 'g');
  normalized_haystack := regexp_replace(normalized_haystack, '\mfront[[:space:]]*end\M', 'frontend', 'g');
  normalized_keyword := regexp_replace(normalized_keyword, '\mfront[[:space:]]*end\M', 'frontend', 'g');
  normalized_haystack := regexp_replace(normalized_haystack, '\mback[[:space:]]*end\M', 'backend', 'g');
  normalized_keyword := regexp_replace(normalized_keyword, '\mback[[:space:]]*end\M', 'backend', 'g');
  normalized_haystack := trim(regexp_replace(normalized_haystack, '[[:space:]]+', ' ', 'g'));
  normalized_keyword := trim(regexp_replace(normalized_keyword, '[[:space:]]+', ' ', 'g'));

  IF normalized_keyword = '' THEN RETURN false; END IF;
  FOR i IN 1..length(normalized_keyword) LOOP
    letter := substr(normalized_keyword,i,1);
    IF strpos(chr(92)||'.^$|?*+()[]{}',letter)>0 THEN
      escaped := escaped || chr(92);
    END IF;
    escaped := escaped || letter;
  END LOOP;
  RETURN normalized_haystack ~ ('(^|[^a-z0-9_])'||escaped||'($|[^a-z0-9_])');
END;
$$;

UPDATE monitors m
SET keywords=(
  SELECT array_agg(value ORDER BY first_position)
  FROM (
    SELECT value,min(position) AS first_position
    FROM unnest(m.keywords || ARRAY[
      'software developer','software development engineer','application developer'
    ]::text[]) WITH ORDINALITY AS expanded(value,position)
    GROUP BY value
  ) deduplicated
)
WHERE EXISTS (
  SELECT 1 FROM unnest(m.keywords) keyword
  WHERE jobradar_keyword_match(keyword,'software engineer')
);

UPDATE monitors m
SET keywords=(
  SELECT array_agg(value ORDER BY first_position)
  FROM (
    SELECT value,min(position) AS first_position
    FROM unnest(m.keywords || ARRAY[
      'full stack developer','full stack engineer','fullstack developer','fullstack engineer'
    ]::text[]) WITH ORDINALITY AS expanded(value,position)
    GROUP BY value
  ) deduplicated
)
WHERE EXISTS (
  SELECT 1 FROM unnest(m.keywords) keyword
  WHERE jobradar_keyword_match(keyword,'full stack developer')
     OR jobradar_keyword_match(keyword,'full stack engineer')
);

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
