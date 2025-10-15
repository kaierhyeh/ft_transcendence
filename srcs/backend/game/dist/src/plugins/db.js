"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const config_1 = require("../config");
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const SessionRepository_1 = require("../db/repositories/SessionRepository");
const dbPlugin = async (fastify) => {
    const db = new better_sqlite3_1.default(config_1.CONFIG.DB.PATH);
    if (config_1.CONFIG.DB.ENABLE_WAL) {
        db.pragma("journal_mode = WAL");
    }
    db.pragma("foreign_keys = ON");
    db.exec(`
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
      user_id INTEGER NOT NULL,
      team TEXT NOT NULL CHECK (team IN ('left', 'right')),
      player_slot TEXT NOT NULL CHECK (player_slot IN ('left', 'right', 'top-left', 'bottom-left', 'top-right', 'bottom-right')),
      score INTEGER DEFAULT 0,
      winner BOOLEAN DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );
  `);
    fastify.decorate("db", db);
    fastify.decorate("repositories", {
        sessions: new SessionRepository_1.SessionRepository(db),
    });
    // Cleanup on server shutdown
    fastify.addHook("onClose", async () => {
        db.close();
    });
};
exports.default = (0, fastify_plugin_1.default)(dbPlugin, {
    name: "db-plugin", // Helps with debugging and plugin dependencies
    fastify: "4.x" // Ensures compatibility
});
//# sourceMappingURL=db.js.map