INSERT INTO monitors(name, keywords, excluded_keywords, location, remote_only, enabled)
SELECT
  'Software roles · Sri Lanka / Colombo / Western',
  ARRAY[
    'software engineer','software developer','full stack developer',
    'frontend developer','backend developer','associate software engineer',
    'junior software engineer','react developer','next.js developer',
    'node developer','laravel developer'
  ],
  ARRAY['senior','lead','principal','staff','manager','architect'],
  'Sri Lanka',
  false,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM monitors WHERE name = 'Software roles · Sri Lanka / Colombo / Western'
);

INSERT INTO monitors(name, keywords, excluded_keywords, location, remote_only, enabled)
SELECT
  'Software Engineering · Qatar',
  ARRAY[
    'software engineer','software developer','full stack developer',
    'frontend developer','backend developer','web developer',
    'react developer','node developer','application developer','platform engineer'
  ],
  ARRAY['director','head of engineering','engineering manager'],
  'Qatar',
  false,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM monitors WHERE name = 'Software Engineering · Qatar'
);

INSERT INTO monitor_matches(monitor_id, job_id)
SELECT m.id, j.id
FROM monitors m
CROSS JOIN jobs j
WHERE m.name IN (
    'Software roles · Sri Lanka / Colombo / Western',
    'Software Engineering · Qatar'
  )
  AND m.enabled
  AND (NOT m.remote_only OR j.remote)
  AND (
    m.location = ''
    OR strpos(lower(j.location), lower(m.location)) > 0
    OR (
      lower(m.location) = 'sri lanka'
      AND lower(j.location) ~ '\m(colombo|kandy|galle|jaffna|gampaha|negombo|matara|kurunegala)\M'
    )
  )
  AND EXISTS (
    SELECT 1 FROM unnest(m.keywords) keyword
    WHERE jobradar_keyword_match(
      j.title || ' ' || array_to_string(j.tags, ' '),
      keyword
    )
  )
  AND NOT EXISTS (
    SELECT 1 FROM unnest(m.excluded_keywords) keyword
    WHERE jobradar_keyword_match(
      j.title || ' ' || array_to_string(j.tags, ' '),
      keyword
    )
  )
ON CONFLICT DO NOTHING;
