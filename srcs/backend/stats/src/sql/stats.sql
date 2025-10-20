CREATE TABLE IF NOT EXISTS user_stats (
  user_id INTEGER PRIMARY KEY,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  curr_winstreak INTEGER NOT NULL DEFAULT 0,
  best_winstreak INTEGER NOT NULL DEFAULT 0,
  total_points_scored INTEGER NOT NULL DEFAULT 0,
  last_updated DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_stats_wins ON user_stats (wins DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_total_points ON user_stats (total_points_scored DESC);
