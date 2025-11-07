-- Friendship requests and relationships
CREATE TABLE IF NOT EXISTS friendships (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   INTEGER NOT NULL,    -- Who sent the request or blocked
    friend_id INTEGER NOT NULL,    -- Who received the request or was blocked
    status    TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(friend_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Prevent self-friendship
    CONSTRAINT no_self_friendship CHECK (user_id <> friend_id)
);

-- Prevent duplicate relationships
CREATE UNIQUE INDEX IF NOT EXISTS unique_friend_pair
ON friendships(
    CASE WHEN user_id < friend_id THEN user_id ELSE friend_id END,
    CASE WHEN user_id < friend_id THEN friend_id ELSE user_id END
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);

