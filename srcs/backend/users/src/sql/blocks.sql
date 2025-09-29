-- User blocks
CREATE TABLE IF NOT EXISTS user_blocks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    blocker_id INTEGER NOT NULL,     -- Who is doing the blocking
    blocked_id INTEGER NOT NULL,     -- Who is being blocked
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY(blocker_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(blocked_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Prevent self-blocking
    CONSTRAINT no_self_block CHECK (blocker_id <> blocked_id),
    -- One block entry per direction (User A can block User B, and User B can block User A)
    CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON user_blocks(blocked_id);
