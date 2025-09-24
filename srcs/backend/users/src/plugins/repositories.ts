import { FastifyPluginAsync } from "fastify";
import Database from "better-sqlite3";
import { CONFIG } from "../config";
import fp from "fastify-plugin";
import { join, dirname } from "path";
import { readFileSync, mkdirSync } from "fs";
import { BlockRepository, FriendRepository, UserRepository } from "../repositories";

declare module "fastify" {
  interface FastifyInstance {
    repositories: {
      users: UserRepository;
      friends: FriendRepository;
      blocks: BlockRepository;
    }
  }
}

const repositoriesPlugin: FastifyPluginAsync = async (fastify) => {
  // Ensure required directories exist
  const dbDir = dirname(CONFIG.DB.PATH);
  const avatarDir = CONFIG.AVATAR.BASE_URL;
  
  try {
    mkdirSync(dbDir, { recursive: true });
    mkdirSync(avatarDir, { recursive: true });
    fastify.log.info(`📁 Created directories: ${dbDir}, ${avatarDir}`);
  } catch (error) {
    fastify.log.error(`❌ Failed to create required directories: ${error}`);
    throw error;
  }

  const db = new Database(CONFIG.DB.PATH);

  if (CONFIG.DB.ENABLE_WAL) {
    db.pragma("journal_mode = WAL");
  }
  db.pragma("foreign_keys = ON");

  const sql_dir = join(__dirname, '../sql');
  const sql_files = [
    'users.sql',
    'friends.sql',
    'blocks.sql'
  ];

  for (const file of sql_files) {
    try {
      const sql = readFileSync(join(sql_dir, file), 'utf8');
      db.exec(sql);
      fastify.log.info(`✅ Executed schema: ${file}`);
    } catch (error) {
      fastify.log.error(`❌ Error executing ${file}: ${error}`);
      throw error;
    }
  }

  fastify.decorate("repositories", {
    users: new UserRepository(db),
    friends: new FriendRepository(db),
    blocks: new BlockRepository(db)
  });

  fastify.addHook("onClose", async () => {
    db.close();
  });
};

export default fp(repositoriesPlugin, {
  name: "repositories-plugin",
  fastify: "5.x"
});
