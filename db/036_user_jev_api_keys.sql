ALTER TABLE users
  ADD COLUMN IF NOT EXISTS jev_api_key_encrypted TEXT;
