-- friendships table
CREATE TABLE IF NOT EXISTS friendships (
    user_id     INTEGER NOT NULL,
    friend_id   INTEGER NOT NULL,
    initiator_id INTEGER NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','blocked')),
    created_at  DATETIME DEFAULT (datetime('now')),

    FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(friend_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(initiator_id) REFERENCES users(user_id) ON DELETE CASCADE,

    CONSTRAINT no_self_friendship CHECK (user_id <> friend_id),
    CONSTRAINT unique_friendship_pair UNIQUE (user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
