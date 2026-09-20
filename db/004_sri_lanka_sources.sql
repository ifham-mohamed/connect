ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_kind_check;
ALTER TABLE sources ADD CONSTRAINT sources_kind_check CHECK (kind IN ('itpro','topjobs','xpressjobs','jobeka','rooster','neojobs','jobster','devjobs','remotive','arbeitnow','greenhouse','lever'));

INSERT INTO sources(name, kind, board, interval_minutes)
VALUES
  ('XpressJobs IT Sector', 'xpressjobs', 'it', 60),
  ('Rooster Jobs', 'rooster', '', 60),
  ('Neo Jobs', 'neojobs', '', 60),
  ('Jobster Sri Lanka', 'jobster', '', 360),
  ('DevJobs Fullstack', 'devjobs', 'fullstack-jobs', 60),
  ('DevJobs React', 'devjobs', 'react-jobs', 60)
ON CONFLICT DO NOTHING;
