DELETE FROM monitors;

INSERT INTO monitors(name, keywords, excluded_keywords)
VALUES
  ('Full Stack Developer', ARRAY['full stack developer','full stack engineer','fullstack developer','fullstack engineer','mern stack developer','mean stack developer'], ARRAY['senior','lead','principal','staff','manager','architect']),
  ('Software Engineer', ARRAY['software engineer','application engineer','platform engineer','product engineer'], ARRAY['senior','lead','principal','staff','manager','architect']),
  ('Software Developer', ARRAY['software developer','application developer','web developer','frontend developer','front end developer','backend developer','back end developer','react developer','node developer','laravel developer'], ARRAY['senior','lead','principal','staff','manager','architect']),
  ('Associate Software Engineer', ARRAY['associate software engineer','junior software engineer','trainee software engineer','intern software engineer','software engineer intern','graduate software engineer','entry level software engineer'], ARRAY['senior','lead','principal','staff','manager','architect']),
  ('Frontend React / Next.js', ARRAY['frontend developer','frontend engineer','front end developer','react developer','next.js developer'], ARRAY['senior','lead','principal','staff','manager','architect']),
  ('Backend Node / Laravel', ARRAY['backend developer','backend engineer','node developer','laravel developer','api developer'], ARRAY['senior','lead','principal','staff','manager','architect']);

INSERT INTO monitor_matches(monitor_id, job_id)
SELECT m.id, j.id
FROM monitors m
CROSS JOIN jobs j
WHERE m.enabled
  AND (NOT m.remote_only OR j.remote)
  AND (m.location='' OR strpos(lower(j.location),lower(m.location))>0 OR (lower(m.location)='sri lanka' AND lower(j.location) ~ '\m(colombo|kandy|galle|jaffna|gampaha|negombo|matara|kurunegala)\M'))
  AND EXISTS(SELECT 1 FROM unnest(m.keywords) k WHERE jobradar_keyword_match(j.title||' '||array_to_string(j.tags,' '),k))
  AND NOT EXISTS(SELECT 1 FROM unnest(m.excluded_keywords) k WHERE jobradar_keyword_match(j.title||' '||array_to_string(j.tags,' '),k))
ON CONFLICT DO NOTHING;
