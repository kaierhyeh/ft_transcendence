import { FastifyPluginAsync } from "fastify";
import Database from "better-sqlite3";
import { CONFIG } from "../config";
import fp from "fastify-plugin";
import { StatsRepository } from "../repositories/StatsRepository";
import { join } from "path";
import { readFileSync } from "fs";

declare module "fastify" {
  interface FastifyInstance {
    stats_repo: StatsRepository;
  }
}

const statsRepositoryPlugin: FastifyPluginAsync = async (fastify) => {
  const db = new Database(CONFIG.DB.PATH);

  if (CONFIG.DB.ENABLE_WAL) {
    db.pragma("journal_mode = WAL");
  }
  db.pragma("foreign_keys = ON");

  const schemaPath = join(__dirname, '../sql/stats.sql');
  try {
    const sql = readFileSync(schemaPath, 'utf8');
    db.exec(sql);
    fastify.log.info(`✅ Stats database schema initialized`);
  } catch (error) {
    fastify.log.error(`❌ Error initializing stats schema: ${error}`);
    throw error;
  }

  fastify.decorate("stats_repo", new StatsRepository(db));

  fastify.addHook("onClose", async () => {
    db.close();
  });
};

export default fp(statsRepositoryPlugin, {
  name: "stats-repository-plugin",
  fastify: "4.x"
});
