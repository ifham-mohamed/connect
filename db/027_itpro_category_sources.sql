INSERT INTO sources(name,kind,board,interval_minutes)
VALUES
  ('ITPro Web Development','itpro','web-development',60),
  ('ITPro Mobile Development','itpro','mobile-development',60),
  ('ITPro DevOps and Cloud','itpro','devops-cloud',60),
  ('ITPro AI and Data','itpro','ai-and-data',60)
ON CONFLICT DO NOTHING;
