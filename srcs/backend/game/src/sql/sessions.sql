CREATE TABLE IF NOT EXISTS sessions (
    id                     INTEGER     PRIMARY KEY AUTOINCREMENT,
    tournament_id          INTEGER,
    format                 TEXT        NOT NULL CHECK (format IN ('1v1', '2v2')),
    mode                   TEXT        NOT NULL CHECK (mode IN ('solo', 'pvp', 'tournament')),
    online                 INTEGER     DEFAULT 0,
    forfeit                INTEGER     DEFAULT 0,
    created_at             DATETIME,
    started_at             DATETIME,
    ended_at               DATETIME
);

CREATE TABLE IF NOT EXISTS player_sessions (
    id                     INTEGER     PRIMARY KEY AUTOINCREMENT,
    session_id             INTEGER     NOT NULL,
    user_id                INTEGER     CHECK ((user_id IS NULL) = (type != 'registered')),
    username               TEXT        CHECK ((username IS NULL) = (user_id IS NULL)),
    type                   TEXT        NOT NULL CHECK (type IN ('registered', 'guest', 'ai')),
    team                   TEXT        NOT NULL CHECK (team IN ('left', 'right')),
    slot                   TEXT        NOT NULL CHECK (slot IN ('left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right')),
    score                  INTEGER     DEFAULT 0,
    winner                 INTEGER     DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES sessions (id)
);
