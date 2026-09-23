ALTER TABLE sources
  ADD COLUMN IF NOT EXISTS response_etag TEXT,
  ADD COLUMN IF NOT EXISTS response_last_modified TEXT,
  ADD COLUMN IF NOT EXISTS lease_token UUID,
  ADD COLUMN IF NOT EXISTS lease_until TIMESTAMPTZ;

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS content_hash TEXT;

CREATE TABLE IF NOT EXISTS data_revisions (
  scope TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  version BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS data_revisions_global_idx
  ON data_revisions(scope) WHERE user_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS data_revisions_user_idx
  ON data_revisions(scope,user_id) WHERE user_id IS NOT NULL;

INSERT INTO data_revisions(scope,user_id)
VALUES ('jobs',NULL),('sources',NULL),('runs',NULL)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS usage_counters (
  day DATE NOT NULL,
  metric TEXT NOT NULL,
  value BIGINT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY(day,metric)
);

CREATE TABLE IF NOT EXISTS source_daily_stats (
  day DATE NOT NULL,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  runs INTEGER NOT NULL DEFAULT 0,
  fetched INTEGER NOT NULL DEFAULT 0,
  added INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day,source_id)
);

CREATE TABLE IF NOT EXISTS ai_workspace_budget (
  singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK(singleton),
  background_enabled BOOLEAN NOT NULL DEFAULT false,
  monthly_request_limit INTEGER NOT NULL DEFAULT 0 CHECK(monthly_request_limit>=0),
  monthly_token_limit INTEGER NOT NULL DEFAULT 0 CHECK(monthly_token_limit>=0),
  paused_reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK(singleton=true)
);
INSERT INTO ai_workspace_budget(singleton) VALUES(true) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS ai_workspace_usage (
  month DATE PRIMARY KEY,
  requests INTEGER NOT NULL DEFAULT 0,
  input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  cache_hits INTEGER NOT NULL DEFAULT 0,
  failures INTEGER NOT NULL DEFAULT 0,
  avoided_requests INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jobs_feed_cursor_idx
  ON jobs((COALESCE(published_at,first_seen_at)) DESC,id DESC);
CREATE INDEX IF NOT EXISTS monitors_user_enabled_idx
  ON monitors(user_id,enabled,id);
CREATE INDEX IF NOT EXISTS job_user_states_user_updated_idx
  ON job_user_states(user_id,updated_at DESC,job_id);
CREATE INDEX IF NOT EXISTS sync_runs_source_started_idx
  ON sync_runs(source_id,started_at DESC);
CREATE INDEX IF NOT EXISTS sources_due_lease_idx
  ON sources(enabled,lease_until,last_attempt_at);

CREATE OR REPLACE FUNCTION jobradar_bump_global_revision()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO data_revisions(scope,user_id,version) VALUES(TG_ARGV[0],NULL,1)
  ON CONFLICT (scope) WHERE user_id IS NULL DO UPDATE
    SET version=data_revisions.version+1,updated_at=now();
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION jobradar_bump_user_revision()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE owner_id UUID;
BEGIN
  IF TG_OP='DELETE' THEN owner_id := OLD.user_id; ELSE owner_id := NEW.user_id; END IF;
  IF owner_id IS NOT NULL THEN
    INSERT INTO data_revisions(scope,user_id,version) VALUES(TG_ARGV[0],owner_id,1)
    ON CONFLICT (scope,user_id) WHERE user_id IS NOT NULL DO UPDATE
      SET version=data_revisions.version+1,updated_at=now();
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jobs_revision_trigger ON jobs;
CREATE TRIGGER jobs_revision_trigger AFTER INSERT OR UPDATE OR DELETE ON jobs
  FOR EACH STATEMENT EXECUTE FUNCTION jobradar_bump_global_revision('jobs');
DROP TRIGGER IF EXISTS sources_revision_trigger ON sources;
CREATE TRIGGER sources_revision_trigger AFTER INSERT OR UPDATE OR DELETE ON sources
  FOR EACH STATEMENT EXECUTE FUNCTION jobradar_bump_global_revision('sources');
DROP TRIGGER IF EXISTS runs_revision_trigger ON sync_runs;
CREATE TRIGGER runs_revision_trigger AFTER INSERT OR UPDATE OR DELETE ON sync_runs
  FOR EACH STATEMENT EXECUTE FUNCTION jobradar_bump_global_revision('runs');
DROP TRIGGER IF EXISTS monitors_revision_trigger ON monitors;
CREATE TRIGGER monitors_revision_trigger AFTER INSERT OR UPDATE OR DELETE ON monitors
  FOR EACH ROW EXECUTE FUNCTION jobradar_bump_user_revision('monitors');
DROP TRIGGER IF EXISTS states_revision_trigger ON job_user_states;
CREATE TRIGGER states_revision_trigger AFTER INSERT OR UPDATE OR DELETE ON job_user_states
  FOR EACH ROW EXECUTE FUNCTION jobradar_bump_user_revision('states');
