CREATE TABLE IF NOT EXISTS users (
  user_id         INTEGER PRIMARY KEY AUTOINCREMENT,

  -- User type (registered, guest, expired, deleted)
  user_type      TEXT NOT NULL DEFAULT 'registered'
                  CHECK (user_type IN ('registered','guest', 'expired', 'deleted')),

  -- login identity (ONLY for registered users)
  username        TEXT COLLATE NOCASE,
  email           TEXT COLLATE NOCASE,

  -- local auth (ONLY for registered users)
  password_hash   TEXT,

  -- display + profile (ALL user types can have alias)
  alias           TEXT,                 -- display name; NOT unique
  avatar_filename TEXT,

  -- 2FA (TOTP) - only for registered users
  two_fa_enabled  INTEGER NOT NULL DEFAULT 0 CHECK (two_fa_enabled IN (0,1)),
  two_fa_secret   TEXT,

  -- Google SSO (ONLY for registered users)
  google_sub      TEXT,

  -- misc (might be useful for all user types)
  settings        TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(settings)),
  status          TEXT NOT NULL DEFAULT 'offline'
                  CHECK (status IN ('online','offline','away')),
  last_seen       DATETIME,
  created_at      DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at      DATETIME NOT NULL DEFAULT (datetime('now')),

  -- REGISTERED users must have username AND email
  CHECK (user_type != 'registered' OR (username IS NOT NULL AND email IS NOT NULL)),
  
  -- GUEST users can ONLY have alias (no credentials, no identity)
  CHECK (user_type != 'guest' OR 
         (username IS NULL AND email IS NULL AND password_hash IS NULL AND 
          google_sub IS NULL AND two_fa_enabled = 0 AND two_fa_secret IS NULL)),
  
  -- EXPIRED/DELETED users have credentials cleared but keep user_id for FK references
  CHECK (user_type NOT IN ('expired', 'deleted') OR 
         (username IS NULL AND email IS NULL AND password_hash IS NULL AND 
          google_sub IS NULL AND two_fa_enabled = 0 AND two_fa_secret IS NULL)),

  -- 2FA integrity
  CHECK (two_fa_enabled = 0 OR two_fa_secret IS NOT NULL),
  
  -- Auth requirement: registered users must have password OR google_sub
  CHECK (user_type != 'registered' OR password_hash IS NOT NULL OR google_sub IS NOT NULL)
);

-- Unique constraints ONLY for registered users
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_registered 
  ON users(username) WHERE username IS NOT NULL AND user_type = 'registered';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_registered 
  ON users(email) WHERE email IS NOT NULL AND user_type = 'registered';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub_registered 
  ON users(google_sub) WHERE google_sub IS NOT NULL AND user_type = 'registered';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
