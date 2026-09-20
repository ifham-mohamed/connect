ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_kind_check;
ALTER TABLE sources ADD CONSTRAINT sources_kind_check CHECK (kind IN ('itpro','topjobs','xpressjobs','jobeka','rooster','neojobs','jobster','devjobs','remotive','arbeitnow','greenhouse','lever'));

INSERT INTO sources(name, kind, board, interval_minutes)
VALUES
  ('ITPro Software Engineering', 'itpro', 'software-engineering', 60),
  ('TopJobs Software Development', 'topjobs', 'SDQ', 60),
  ('JobEka IT Software & Design', 'jobeka', 'IT-Software-and-Design', 360)
ON CONFLICT DO NOTHING;
