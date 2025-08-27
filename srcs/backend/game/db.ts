// src/db.ts
import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";
import Database from "better-sqlite3";

// Add type augmentation here - use the correct type
declare module "fastify" {
  interface FastifyInstance {
    db: Database.Database; // ← Use Database.Database instead of just Database
  }
}

export interface DbPluginOptions {
  dbFilePath?: string; // configurable, default below
}

const dbConnector: FastifyPluginAsync<DbPluginOptions> = async (fastify, opts) => {
  const dbPath = opts.dbFilePath ?? "./sessions/sessions.db";
  const db = new Database(dbPath, { verbose: console.log });

  // (Optional) Pragmas that are commonly useful with SQLite
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // ✅ Fixed SQL syntax (your original had a few issues)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('pvp', 'multi', 'tournament')) DEFAULT 'pvp',
      tournament_id INTEGER DEFAULT NULL,
      player1_id INTEGER NOT NULL,
      player2_id INTEGER NOT NULL,
      player3_id INTEGER DEFAULT NULL,
      player4_id INTEGER DEFAULT NULL,
      score_player1 INTEGER DEFAULT 0,
      score_player2 INTEGER DEFAULT 0,
      score_player3 INTEGER DEFAULT NULL,
      score_player4 INTEGER DEFAULT NULL,
      winner_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CHECK (type != 'tournament' OR tournament_id IS NOT NULL)
    );
  `);

  // expose db on the fastify instance
  fastify.decorate("db", db);

  // graceful shutdown
  fastify.addHook("onClose", (instance, done) => {
    db.close();
    done();
  });

  fastify.log.info(`SQLite ready at ${dbPath}`);
};

// Export as a Fastify plugin (so decoration is visible to parent scope)
export default fp(dbConnector, {
  name: "db-connector",
  fastify: "4.x",
});
