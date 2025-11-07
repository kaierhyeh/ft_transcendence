import { FastifyPluginAsync } from "fastify";
import Database from "better-sqlite3";
import { CONFIG } from "../config";
import fp from "fastify-plugin";
import { SessionRepository } from "../repositories/SessionRepository";
import { join } from "path";
import { readFileSync } from "fs";

declare module "fastify" {
  interface FastifyInstance {
    session_repo: SessionRepository;
  }
}

const sessionRepositoryPlugin: FastifyPluginAsync = async (fastify) => {
  const db = new Database(CONFIG.DB.PATH);

  if (CONFIG.DB.ENABLE_WAL) {
    db.pragma("journal_mode = WAL");
  }
  db.pragma("foreign_keys = ON");

  // Initialize schema
  const schemaPath = join(__dirname, '../sql/sessions.sql');
  try {
    const sql = readFileSync(schemaPath, 'utf8');
    db.exec(sql);
    fastify.log.info(`✅ Database schema initialized`);
  } catch (error) {
    fastify.log.error(`❌ Error initializing schema: ${error}`);
    throw error;
  }

  // Decorate fastify with direct access
  fastify.decorate("session_repo", new SessionRepository(db));

  // Cleanup on server shutdown
  fastify.addHook("onClose", async () => {
    db.close();
  });
};

export default fp(sessionRepositoryPlugin, {
  name: "session-repository-plugin",        // Helps with debugging and plugin dependencies
  fastify: "5.x"           // Ensures compatibility
});
