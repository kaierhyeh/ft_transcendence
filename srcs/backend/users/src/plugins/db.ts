import { FastifyPluginAsync } from "fastify";
import Database from "better-sqlite3";
import { CONFIG } from "../config";
import fp from "fastify-plugin";
import { UserRepository } from "../db/repositories/UserRepository";
import { FriendRepository } from "../db/repositories/FriendRepository";
import { BlockRepository } from "../db/repositories/BlockRepository";

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

  db.exec(`
  `);

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
