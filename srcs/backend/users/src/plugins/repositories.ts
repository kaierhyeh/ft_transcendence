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
    'friends.sql'
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

  //  SEED DATA
//   try {
//     // Example: Insert initial chat rooms or users
//     const rowU = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
//     const existingUsers= rowU.count;
//     if (existingUsers === 0) {
//       const insert = db.prepare(`
//         INSERT INTO users (username, email, password_hash, alias, avatar_filename)
//         VALUES (@username, @email, @password_hash, @alias, @avatar_filename)
//         `);
//         const now = new Date().toISOString();
//         // Example seed users
//         const seedData = [
//           { username: 'alice',    email: 'alice@ya.com',    password_hash: 'hash1', alias: 'A_lice',    avatar_filename: 'test2.gif' },
//           { username: 'bob',      email: 'bob@ya.com',      password_hash: 'hash2', alias: 'B_ob',      avatar_filename: 'test1.jpg' },
//           { username: 'charlie',  email: 'charlie@ya.com',  password_hash: 'hash3', alias: 'C_harlie',  avatar_filename: 'default.png' },
//           { username: 'dave',     email: 'dave@ya.com',     password_hash: 'hash4', alias: null,        avatar_filename: 'test2.gif' },
//           { username: 'eve',      email: 'eve@ya.com',      password_hash: 'hash5', alias: 'E_ve',      avatar_filename: 'test2.gif' },
//           { username: 'frank',    email: 'frank@ya.com',    password_hash: 'hash6', alias: null,        avatar_filename: 'test1.jpg' },
//           { username: 'grace',    email: 'grace@ya.com',    password_hash: 'hash7', alias: 'G_race',    avatar_filename: 'test2.gif' },
//           { username: 'heidi',    email: 'heidi@ya.com',    password_hash: 'hash8', alias: 'H_eidi',    avatar_filename: 'default.png' }
//         ];
//         const insertMany = db.transaction((users) => {
//           for (const user of users) insert.run(user);
//         });
//         insertMany(seedData);
//         fastify.log.info("🌱 Seed data inserted into users table");
//       } else {
//         fastify.log.info("🌾 Users table already has data — skipping seed");
//       }
//       const rowF = db.prepare("SELECT COUNT(*) as count FROM friendships").get() as { count: number };
//       const existingMessages = rowF.count;
//       if (existingMessages === 0) {
//         const insert = db.prepare(`
//           INSERT INTO friendships (user_id, friend_id, status)
//           VALUES (@user_id, @friend_id, @status)
//           `);
//           // Example seed friendships
//           const seedData = [
//             { user_id: 1, friend_id: 2, status: 'accepted' },
//             { user_id: 1, friend_id: 3, status: 'pending' },
//             { user_id: 4, friend_id: 1, status: 'pending' },
//             { user_id: 5, friend_id: 1, status: 'blocked' },
//             { user_id: 2, friend_id: 3, status: 'accepted' },
//             { user_id: 3, friend_id: 4, status: 'pending' },
//             { user_id: 6, friend_id: 7, status: 'accepted' },
//             { user_id: 7, friend_id: 8, status: 'blocked' },
//             { user_id: 8, friend_id: 1, status: 'accepted' },
//             { user_id: 1, friend_id: 6, status: 'blocked' }
//           ];
//           const insertMany = db.transaction((friendships) => {
//         for (const friendship of friendships) insert.run(friendship);
//       });
//       insertMany(seedData);
//       fastify.log.info("🌱 Seed data inserted into friendships table");
//     } else {
//       fastify.log.info("🌾 Friendships table already has data — skipping seed");
//     }
//   } catch (error) {
//     fastify.log.error(`❌ Failed to seed data: ${error}`);
//     throw error;
//   }
  //  END SEED DATA
  
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
