CREATE TABLE IF NOT EXISTS users (
  user_id         INTEGER PRIMARY KEY AUTOINCREMENT,

  -- login identity (case-insensitive uniqueness)
  username        TEXT NOT NULL COLLATE NOCASE UNIQUE,
  email           TEXT NOT NULL COLLATE NOCASE UNIQUE,

  -- local auth (nullable if SSO-only account)
  password_hash   TEXT,

  -- display + profile
  alias           TEXT,                 -- display name; NOT unique here (see note below)
  avatar_url      TEXT,

  -- 2FA (TOTP)
  two_fa_enabled  INTEGER NOT NULL DEFAULT 0 CHECK (two_fa_enabled IN (0,1)),
  two_fa_secret   TEXT,                 -- base32; required iff two_fa_enabled = 1

  -- [OPTIONAL] Email verification
  -- email_verified  INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0,1)),

  -- Google SSO (OpenID Connect "sub" — stable, opaque, globally unique)
  google_sub      TEXT UNIQUE,

  -- misc
  settings        TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(settings)),
  status          TEXT NOT NULL DEFAULT 'offline'
                  CHECK (status IN ('online','offline','away')),
  last_seen       DATETIME,
  created_at      DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at      DATETIME NOT NULL DEFAULT (datetime('now')),

  -- integrity rules inside this row
  CHECK (two_fa_enabled = 0 OR two_fa_secret IS NOT NULL),
  CHECK (password_hash IS NOT NULL OR google_sub IS NOT NULL)
);

-- Index to efficiently query users by their status (e.g., online/offline/away)
CREATE INDEX IF NOT EXISTS idx_users_status   ON users(status);

-- Index to speed up queries that sort or filter users by their last activity time
CREATE INDEX IF NOT EXISTS idx_users_lastseen ON users(last_seen);

-- CREATE UNIQUE INDEX idx_users_email ON users(email);
-- CREATE UNIQUE INDEX idx_users_username ON users(username);
