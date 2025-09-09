-- users table
CREATE TABLE IF NOT EXISTS users (
    user_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    alias         TEXT,
    avatar_url    TEXT,

    two_fa_enabled INTEGER NOT NULL DEFAULT 0 CHECK (two_fa_enabled IN (0,1)),
    two_fa_secret  TEXT,

    google_account INTEGER NOT NULL DEFAULT 0 CHECK (google_account IN (0,1)),
    google_name    TEXT,

    settings      TEXT DEFAULT '{}',                -- JSON string

    created_at    DATETIME DEFAULT (datetime('now')),
    updated_at    DATETIME DEFAULT (datetime('now')),
    last_seen     DATETIME,
    status        TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online','offline','away')),

    CONSTRAINT username_min_len CHECK (length(username) >= 3)
);

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen);