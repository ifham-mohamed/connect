CREATE TABLE IF NOT EXISTS request_rate_limits (
  scope TEXT NOT NULL,
  identity TEXT NOT NULL,
  attempts INTEGER NOT NULL CHECK (attempts > 0),
  reset_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(scope,identity)
);

CREATE INDEX IF NOT EXISTS request_rate_limits_reset_idx
  ON request_rate_limits(reset_at);
