-- Friendship requests and relationships
CREATE TABLE IF NOT EXISTS friendships (
    id           INTEGER PRIMARY KEY,
    requester_id INTEGER NOT NULL,    -- Who sent the request
    addressee_id INTEGER NOT NULL,    -- Who received the request
    status       TEXT NOT NULL CHECK (
        status IN ('pending', 'accepted', 'declined')
    ),
    created_at   DATETIME NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY(requester_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(addressee_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Prevent self-friendship
    CONSTRAINT no_self_friendship CHECK (requester_id <> addressee_id),
    -- Only one friendship request between any two users (in either direction)
    CONSTRAINT unique_friendship UNIQUE (
        CASE WHEN requester_id < addressee_id THEN requester_id ELSE addressee_id END,
        CASE WHEN requester_id < addressee_id THEN addressee_id ELSE requester_id END
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);