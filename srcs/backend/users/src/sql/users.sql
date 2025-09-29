CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- login identity
  username                TEXT        COLLATE nocase,
  email                   TEXT        COLLATE nocase,

  -- local auth
  password_hash           TEXT,

  -- display + profile
  alias                   TEXT,                 -- display name; NOT unique
  avatar_filename         TEXT        DEFAULT 'default.png',

  -- 2FA (TOTP)
  two_fa_enabled          INTEGER     NOT NULL DEFAULT 0 CHECK (two_fa_enabled IN (0, 1)),
  two_fa_secret           TEXT,

  -- Google SSO
  google_sub              TEXT,

  -- misc
  settings                TEXT        NOT NULL DEFAULT '{}' CHECK (json_valid(settings)),
  status                  TEXT        NOT NULL DEFAULT 'offline'
                                      CHECK (status IN ('online', 'offline', 'away', 'deleted')),
  last_seen               DATETIME,
  created_at              DATETIME    NOT NULL DEFAULT (datetime('now')),
  updated_at              DATETIME    NOT NULL DEFAULT (datetime('now')),

  -- Active users must have username AND email
  CHECK (status = 'deleted' OR (username IS NOT NULL AND email IS NOT NULL)),

  -- Deleted users have credentials cleared but keep user_id for FK references
  CHECK (status != 'deleted'
         OR (username IS NULL AND email IS NULL AND password_hash IS NULL
             AND google_sub IS NULL AND two_fa_enabled = 0 AND two_fa_secret IS NULL
             AND alias IS NULL AND avatar_filename IS NULL)),

  -- 2FA integrity  
  CHECK (two_fa_enabled = 0 OR two_fa_secret IS NOT NULL),

  -- Auth requirement: active users must have password OR google_sub
  CHECK (status = 'deleted' OR password_hash IS NOT NULL OR google_sub IS NOT NULL)
);

-- Unique constraints for active users only
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_active
  ON users (username)
  WHERE username IS NOT NULL AND status != 'deleted';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_active
  ON users (email)
  WHERE email IS NOT NULL AND status != 'deleted';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub_active
  ON users (google_sub)
  WHERE google_sub IS NOT NULL AND status != 'deleted';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);
