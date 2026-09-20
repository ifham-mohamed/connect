INSERT INTO monitors(name, keywords, excluded_keywords, location, remote_only, enabled)
SELECT
  'Early-career software · Sri Lanka',
  ARRAY[
    'associate software engineer','junior software engineer',
    'trainee software engineer','graduate software engineer',
    'entry level software engineer','software engineer intern',
    'intern software engineer','junior developer','trainee developer'
  ],
  ARRAY['senior','lead','principal','staff','manager','architect'],
  'Sri Lanka',
  false,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM monitors WHERE name = 'Early-career software · Sri Lanka'
);

INSERT INTO monitors(name, keywords, excluded_keywords, location, remote_only, enabled)
SELECT
  'Remote React / Full Stack · Worldwide',
  ARRAY[
    'react developer','react engineer','frontend developer','frontend engineer',
    'next.js developer','full stack developer','full stack engineer',
    'node developer','typescript developer'
  ],
  ARRAY['director','head of engineering','engineering manager'],
  '',
  true,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM monitors WHERE name = 'Remote React / Full Stack · Worldwide'
);

INSERT INTO monitors(name, keywords, excluded_keywords, location, remote_only, enabled)
SELECT
  'Early-career software · Qatar',
  ARRAY[
    'junior software engineer','associate software engineer',
    'entry level software engineer','graduate software engineer',
    'junior developer','software developer','frontend developer',
    'backend developer','full stack developer'
  ],
  ARRAY['senior','lead','principal','staff','manager','architect'],
  'Qatar',
  false,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM monitors WHERE name = 'Early-career software · Qatar'
);

INSERT INTO monitor_matches(monitor_id, job_id)
SELECT m.id, j.id
FROM monitors m
CROSS JOIN jobs j
WHERE m.name IN (
    'Early-career software · Sri Lanka',
    'Remote React / Full Stack · Worldwide',
    'Early-career software · Qatar'
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
