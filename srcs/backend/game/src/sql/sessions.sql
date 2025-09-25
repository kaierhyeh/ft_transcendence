CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('pvp', 'multi', 'tournament')),
    tournament_id INTEGER DEFAULT NULL,
    created_at DATETIME,
    started_at DATETIME,
    ended_at DATETIME,
    CHECK (type != 'tournament' OR tournament_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS player_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    user_id INTEGER,
    type TEXT NOT NULL CHECK (type IN ('registered', 'guest', 'ai')),
    team TEXT NOT NULL CHECK (team IN ('left', 'right')),
    score INTEGER DEFAULT 0,
    winner BOOLEAN DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);