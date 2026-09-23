ALTER TABLE user_sessions
  ADD COLUMN IF NOT EXISTS ip_hash TEXT,
  ADD COLUMN IF NOT EXISTS user_agent_hash TEXT,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS user_sessions_active_idx
  ON user_sessions(user_id,expires_at DESC)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID,
  event_type TEXT NOT NULL CHECK (char_length(event_type) BETWEEN 3 AND 80),
  severity TEXT NOT NULL CHECK (severity IN ('info','warning','critical')),
  route TEXT NOT NULL DEFAULT '',
  ip_hash TEXT,
  user_agent_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS security_events_user_recent_idx
  ON security_events(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS security_events_severity_recent_idx
  ON security_events(severity,created_at DESC);
