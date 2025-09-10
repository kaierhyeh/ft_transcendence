-- blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
    blocker_id INTEGER NOT NULL,
    blocked_id INTEGER NOT NULL,
    blocked_at DATETIME DEFAULT (datetime('now')),

    FOREIGN KEY(blocker_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(blocked_id) REFERENCES users(user_id) ON DELETE CASCADE,

    CONSTRAINT no_self_block CHECK (blocker_id <> blocked_id),
    CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_blocked ON blocked_users(blocked_id);
