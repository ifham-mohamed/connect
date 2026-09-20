CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('itpro','topjobs','xpressjobs','jobeka','rooster','neojobs','jobster','devjobs','remotive','arbeitnow','greenhouse','lever')),
  board TEXT NOT NULL DEFAULT '', enabled BOOLEAN NOT NULL DEFAULT true,
  interval_minutes INTEGER NOT NULL DEFAULT 360 CHECK (interval_minutes >= 60),
  last_synced_at TIMESTAMPTZ, last_attempt_at TIMESTAMPTZ, last_error TEXT,
  UNIQUE(kind, board)
);
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), source_id UUID NOT NULL REFERENCES sources(id),
  external_id TEXT NOT NULL, title TEXT NOT NULL, company TEXT NOT NULL, location TEXT NOT NULL,
  remote BOOLEAN NOT NULL DEFAULT false, employment_type TEXT NOT NULL DEFAULT '',
  salary TEXT NOT NULL DEFAULT '', tags TEXT[] NOT NULL DEFAULT '{}', description TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL, published_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','saved','applied','archived')),
  active BOOLEAN NOT NULL DEFAULT true, UNIQUE(source_id, external_id)
);
CREATE INDEX IF NOT EXISTS jobs_published_idx ON jobs(published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS jobs_source_idx ON jobs(source_id);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs(status);
CREATE INDEX IF NOT EXISTS jobs_search_idx ON jobs USING GIN(to_tsvector('english', title || ' ' || company || ' ' || description));
CREATE TABLE IF NOT EXISTS monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, keywords TEXT[] NOT NULL,
  excluded_keywords TEXT[] NOT NULL DEFAULT '{}', location TEXT NOT NULL DEFAULT '',
  remote_only BOOLEAN NOT NULL DEFAULT false, enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS monitor_matches (
  monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  matched_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(monitor_id, job_id)
);
CREATE TABLE IF NOT EXISTS sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), source_id UUID NOT NULL REFERENCES sources(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(), finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','failed')),
  fetched INTEGER NOT NULL DEFAULT 0, added INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE INDEX IF NOT EXISTS sync_runs_started_idx ON sync_runs(started_at DESC);
CREATE TABLE IF NOT EXISTS auth_attempts (bucket TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset_at TIMESTAMPTZ NOT NULL);
CREATE OR REPLACE FUNCTION jobradar_keyword_match(haystack TEXT, keyword TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE escaped TEXT := ''; letter TEXT; i INTEGER;
BEGIN
  IF keyword = '' THEN RETURN false; END IF;
  FOR i IN 1..length(keyword) LOOP
    letter := substr(keyword,i,1);
    IF strpos(chr(92)||'.^$|?*+()[]{}',letter)>0 THEN escaped := escaped || chr(92); END IF;
    escaped := escaped || letter;
  END LOOP;
  RETURN lower(haystack) ~ ('(^|[^a-z0-9_])'||lower(escaped)||'($|[^a-z0-9_])');
END;
$$;
INSERT INTO sources(name, kind, interval_minutes) VALUES ('ITPro.lk', 'itpro', 60), ('Remotive', 'remotive', 360) ON CONFLICT DO NOTHING;
INSERT INTO sources(name, kind, board, interval_minutes) VALUES
  ('ITPro Software Engineering', 'itpro', 'software-engineering', 60),
  ('TopJobs Software Development', 'topjobs', 'SDQ', 60),
  ('XpressJobs IT Sector', 'xpressjobs', 'it', 60),
  ('JobEka IT Software & Design', 'jobeka', 'IT-Software-and-Design', 360),
  ('Rooster Jobs', 'rooster', '', 60),
  ('Neo Jobs', 'neojobs', '', 60),
  ('Jobster Sri Lanka', 'jobster', '', 360),
  ('DevJobs Fullstack', 'devjobs', 'fullstack-jobs', 60),
  ('DevJobs React', 'devjobs', 'react-jobs', 60)
ON CONFLICT DO NOTHING;
INSERT INTO sources(name, kind, board, interval_minutes) VALUES ('Dijital Team', 'lever', 'dijital-team-pty-ltd', 60) ON CONFLICT DO NOTHING;
INSERT INTO monitors(name, keywords, excluded_keywords)
SELECT 'Full Stack Developer', ARRAY['full stack developer','full stack engineer','fullstack developer','fullstack engineer','mern stack developer','mean stack developer'], ARRAY['senior','lead','principal','staff','manager','architect']
WHERE NOT EXISTS (SELECT 1 FROM monitors);
INSERT INTO monitors(name, keywords, excluded_keywords)
SELECT 'Software Engineer', ARRAY['software engineer','application engineer','platform engineer','product engineer'], ARRAY['senior','lead','principal','staff','manager','architect']
WHERE NOT EXISTS (SELECT 1 FROM monitors WHERE name = 'Software Engineer');
INSERT INTO monitors(name, keywords, excluded_keywords)
SELECT 'Software Developer', ARRAY['software developer','application developer','web developer','frontend developer','front end developer','backend developer','back end developer','react developer','node developer','laravel developer'], ARRAY['senior','lead','principal','staff','manager','architect']
WHERE NOT EXISTS (SELECT 1 FROM monitors WHERE name = 'Software Developer');
INSERT INTO monitors(name, keywords, excluded_keywords)
SELECT 'Associate Software Engineer', ARRAY['associate software engineer','junior software engineer','trainee software engineer','intern software engineer','software engineer intern','graduate software engineer','entry level software engineer'], ARRAY['senior','lead','principal','staff','manager','architect']
WHERE NOT EXISTS (SELECT 1 FROM monitors WHERE name = 'Associate Software Engineer');
INSERT INTO monitors(name, keywords, excluded_keywords)
SELECT 'Frontend React / Next.js', ARRAY['frontend developer','frontend engineer','front end developer','react developer','next.js developer'], ARRAY['senior','lead','principal','staff','manager','architect']
WHERE NOT EXISTS (SELECT 1 FROM monitors WHERE name = 'Frontend React / Next.js');
INSERT INTO monitors(name, keywords, excluded_keywords)
SELECT 'Backend Node / Laravel', ARRAY['backend developer','backend engineer','node developer','laravel developer','api developer'], ARRAY['senior','lead','principal','staff','manager','architect']
WHERE NOT EXISTS (SELECT 1 FROM monitors WHERE name = 'Backend Node / Laravel');
