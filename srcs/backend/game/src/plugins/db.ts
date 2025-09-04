import { FastifyPluginAsync } from "fastify";
import Database from "better-sqlite3";
import { CONFIG } from "../config";
import fp from "fastify-plugin";

declare module "fastify" {
  interface FastifyInstance {
    db: Database.Database;
  }
}

const dbPlugin: FastifyPluginAsync = async (fastify, opts) => {
  const db = new Database(CONFIG.DB.PATH);

  if (CONFIG.DB.ENABLE_WAL) {
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

  // Cleanup on server shutdown
  fastify.addHook("onClose", async () => {
    db.close();
  });
};

export default fp(dbPlugin, {
  name: "db-plugin",        // Helps with debugging and plugin dependencies
  fastify: "4.x"           // Ensures compatibility
});
