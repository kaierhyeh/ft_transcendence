CREATE TABLE IF NOT EXISTS users (
    -- Primary key
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Core identity fields
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,  -- Display name, case-insensitive unique
    password_hash TEXT,                             -- bcrypt hash (NULL for Google accounts)
    alias TEXT,                                     -- Optional display alias
    email TEXT,                                     -- Optional email (nullable, not unique)
    
    -- Avatar fields
    avatar_filename TEXT NOT NULL DEFAULT 'default.png',
    avatar_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Two-factor authentication
    two_fa_enabled INTEGER NOT NULL DEFAULT 0 CHECK(two_fa_enabled IN (0, 1)),
    two_fa_secret TEXT,
    
    -- OAuth integration
    google_sub TEXT UNIQUE,                         -- Google's unique identifier (NULL for local accounts)
    
    -- User settings and metadata
    settings TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen TEXT,
    
    -- Ensure user is either local (has password) OR Google (has google_sub), not both
    CHECK (
        (password_hash IS NOT NULL AND google_sub IS NULL) OR
        (password_hash IS NULL AND google_sub IS NOT NULL)
    )
);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
  ON users (username);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub
  ON users (google_sub)
  WHERE google_sub IS NOT NULL;