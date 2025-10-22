CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- login identity
  username                TEXT        NOT NULL COLLATE nocase,

  -- local auth
  password_hash           TEXT,

  -- display + profile
  alias                   TEXT,                 -- display name; NOT unique
  avatar_filename         TEXT        NOT NULL DEFAULT 'default.png',
  avatar_updated_at       DATETIME    NOT NULL DEFAULT (datetime('now')),

  -- 2FA (TOTP)
  two_fa_enabled          INTEGER     NOT NULL DEFAULT 0 CHECK (two_fa_enabled IN (0, 1)),
  two_fa_secret           TEXT,

  -- Google SSO
  google_sub              TEXT,

  -- misc
  settings                TEXT        NOT NULL DEFAULT '{}' CHECK (json_valid(settings)),
  last_seen               DATETIME,
  created_at              DATETIME    NOT NULL DEFAULT (datetime('now')),
  updated_at              DATETIME    NOT NULL DEFAULT (datetime('now')),

  -- 2FA integrity  
  CHECK (two_fa_enabled = 0 OR two_fa_secret IS NOT NULL),

  -- Auth requirement: users must have password OR google_sub
  CHECK (password_hash IS NOT NULL OR google_sub IS NOT NULL)
);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
  ON users (username);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub
  ON users (google_sub)
  WHERE google_sub IS NOT NULL;