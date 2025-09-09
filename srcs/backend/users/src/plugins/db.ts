import { FastifyPluginAsync } from "fastify";
import Database from "better-sqlite3";
import { CONFIG } from "../config";
import fp from "fastify-plugin";
import { join } from "path";
import { readFileSync } from "fs";
import { BlockRepository, FriendRepository, UserRepository } from "../db/repositories";

declare module "fastify" {
  interface FastifyInstance {
    db: Database.Database;
    repositories: {
      users: UserRepository;
      friends: FriendRepository;
      blocks: BlockRepository;
    }
  }
}

const dbPlugin: FastifyPluginAsync = async (fastify) => {
  const db = new Database(CONFIG.DB.PATH);

  if (CONFIG.DB.ENABLE_WAL) {
    db.pragma("journal_mode = WAL");
  }
  db.pragma("foreign_keys = ON");

  const sql_dir = join(__dirname, '../db/sql');
  const sql_files = [
    'users.sql',
    'friendships.sql',
    'blocked_users.sql'
  ];

  for (const file of sql_files) {
    try {
      const sql =readFileSync(join(sql_dir, file), 'utf8');
      db.exec(sql);
      fastify.log.info(`✅ Executed schema: ${file}`);
    } catch (error) {
      fastify.log.error(`❌ Error executing ${file}: ${error}`);
      throw error;
    }
  }

  fastify.decorate("db", db);
  fastify.decorate("repositories", {
    users: new UserRepository(db),
    friends: new FriendRepository(db),
    blocks: new BlockRepository(db)
  });

  // Cleanup on server shutdown
  fastify.addHook("onClose", async () => {
    db.close();
  });
};

export default fp(dbPlugin, {
  name: "db-plugin",        // Helps with debugging and plugin dependencies
  fastify: "4.x"           // Ensures compatibility
});
