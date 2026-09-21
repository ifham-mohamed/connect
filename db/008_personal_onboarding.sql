ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE monitors
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS monitors_user_idx ON monitors(user_id, created_at);

UPDATE monitors
SET user_id = (SELECT id FROM users ORDER BY created_at, id LIMIT 1)
WHERE user_id IS NULL
  AND EXISTS (SELECT 1 FROM users);

UPDATE users
SET onboarding_completed_at = COALESCE(onboarding_completed_at, now())
WHERE EXISTS (SELECT 1 FROM monitors WHERE monitors.user_id = users.id);
