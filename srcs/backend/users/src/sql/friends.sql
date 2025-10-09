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
    CONSTRAINT no_self_friendship CHECK (user_id <> friend_id),
    -- Prevent duplicate relationships in the same direction
    CONSTRAINT unique_relationship UNIQUE (user_id, friend_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);

-- IT IS A TEST DATA FOR MENU: USERS, FRIENDS --
-- DELETE IT WHEN YOU WILL HAVE REAL DATA --

-- Insert sample users

INSERT INTO users (username, email, password_hash, alias, avatar_filename, status)
VALUES
  ('alice', 'alice@ya.com', 'hash1', 'A_lice', 'alice.png', 'online'),
  ('bob', 'bob@ya.com', 'hash2', 'B_ob', 'bob.png', 'offline'),
  ('charlie', 'charlie@ya.com', 'hash3', 'C_harlie', 'charlie.png', 'away'),
  ('dave', 'dave@ya.com', 'hash4', NULL, 'dave.png', 'online'),
  ('eve', 'eve@ya.com', 'hash5', 'E_ve', 'eve.png', 'offline'),
  ('frank', 'frank@ya.com', 'hash6', NULL, 'frank.png', 'online'),
  ('grace', 'grace@ya.com', 'hash7', 'G_race', 'grace.png', 'offline'),
  ('heidi', 'heidi@ya.com', 'hash8', 'H_eidi', 'heidi.png', 'online');

-- Insert friendships (alice ↔ bob accepted, alice → charlie pending)

INSERT INTO friendships (user_id, friend_id, status)
VALUES
  (1, 2, 'accepted'),
  (1, 3, 'pending'),
  (4, 1, 'pending'),
  (5, 1, 'blocked'),
  (2, 3, 'accepted'),
  (3, 4, 'pending'),
  (6, 7, 'accepted'),
  (7, 8, 'blocked'),
  (8, 1, 'accepted'),
  (1, 6, 'blocked');