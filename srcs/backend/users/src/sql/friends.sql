-- Friendship requests and relationships
CREATE TABLE IF NOT EXISTS friendships (
    id        INTEGER PRIMARY KEY,
    user_id   INTEGER NOT NULL,    -- User in the relationship
    friend_id INTEGER NOT NULL,    -- Friend in the relationship
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(friend_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Prevent self-friendship
    CONSTRAINT no_self_friendship CHECK (user_id <> friend_id),
    -- Prevent duplicate relationships in the same direction
    CONSTRAINT unique_relationship UNIQUE (user_id, friend_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);