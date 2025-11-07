import { FastifyPluginAsync } from "fastify";
import Database from "better-sqlite3";
import { CONFIG } from "../config";
import fp from "fastify-plugin";
import { join, dirname } from "path";
import { readFileSync, mkdirSync } from "fs";
import { ChatRepository } from "../repositories/chats.repository";
import { MessageRepository } from "../repositories/messages.repository";

declare module "fastify" {
	interface FastifyInstance {
		repositories: {
			chats: ChatRepository;
			messages: MessageRepository;
		}
	}
}

const repositoriesPlugin: FastifyPluginAsync = async (fastify) => {
	// Ensure required directories exist
	const dbDir = dirname(CONFIG.DB.PATH);
	
	try {
		mkdirSync(dbDir, { recursive: true });
		fastify.log.info(`📁 Created directories: ${dbDir}`);
	} catch (error) {
		fastify.log.error(`❌ Failed to create required directories: ${error}`);
		throw error;
	}

	const db = new Database(CONFIG.DB.PATH);

	if (CONFIG.DB.ENABLE_WAL) {
		db.pragma("journal_mode = WAL");
	}
	db.pragma("foreign_keys = ON");

	const sql_dir = join(__dirname, '../db');
	const sql_files = [
		'schema.sql'
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
	// try {
	// 	// Example: Insert initial chat rooms or users
	// 	const rowC = db.prepare("SELECT COUNT(*) as count FROM chats").get() as { count: number };
	// 	const existingChats = rowC.count;
	// 	if (existingChats === 0) {
	// 		const insert = db.prepare(`
	// 			INSERT INTO chats (user_id_a, user_id_b)
	// 			VALUES (@a, @b)
	// 		`);
	// 		const now = new Date().toISOString();
	// 		// Example seed chats
	// 		const seedData = [
	// 			{ a: 1, b: 9 },
	// 			{ a: 9, b: 6 },
	// 			{ a: 3, b: 9 },
	// 			{ a: 2, b: 5 }
	// 		];
	// 		const insertMany = db.transaction((chats) => {
	// 			for (const chat of chats) insert.run(chat);
	// 		});
	// 		insertMany(seedData);
	// 		fastify.log.info("🌱 Seed data inserted into chats table");
	// 	} else {
	// 		fastify.log.info("🌾 Chats table already has data — skipping seed");
	// 	}
	// 	const rowM = db.prepare("SELECT COUNT(*) as count FROM messages").get() as { count: number };
	// 	const existingMessages = rowM.count;
	// 	if (existingMessages === 0) {
	// 		const insert = db.prepare(`
	// 			INSERT INTO messages (chat_id, from_id, to_id, msg, blocked)
	// 			VALUES (@chat_id, @from_id, @to_id, @msg, @blocked)
	// 		`);
	// 		// Example seed messages
	// 		const seedData = [
	// 			{ chat_id: 1, from_id: 1, to_id: 9, msg: "Hello from user 1 to user 9", blocked: 0 },
	// 			{ chat_id: 1, from_id: 9, to_id: 1, msg: "Hi user 1, this is user 9", blocked: 0 },

	// 			{ chat_id: 2, from_id: 9, to_id: 6, msg: "Hey user 6, user 9 here", blocked: 0 },
	// 			{ chat_id: 2, from_id: 6, to_id: 9, msg: "Hello user 9, user 6 responding", blocked: 0 },
	// 			{ chat_id: 2, from_id: 9, to_id: 6, msg: "Blocked 9-6 1", blocked: 1 },
	// 			{ chat_id: 2, from_id: 9, to_id: 6, msg: "Blocked 9-6 2", blocked: 1 },
	// 			{ chat_id: 2, from_id: 9, to_id: 6, msg: "Blocked 9-6 3", blocked: 1 },
	// 			{ chat_id: 2, from_id: 9, to_id: 6, msg: "1 Another message from user 9 to user 6", blocked: 0 },
	// 			{ chat_id: 2, from_id: 6, to_id: 9, msg: "2 Another message from user 9 to user 6", blocked: 0 },
	// 			{ chat_id: 2, from_id: 9, to_id: 6, msg: "3 Another message from user 9 to user 6", blocked: 0 },
	// 			{ chat_id: 2, from_id: 9, to_id: 6, msg: "4 Another message from user 9 to user 6", blocked: 0 },
	// 			{ chat_id: 2, from_id: 9, to_id: 6, msg: "5 Another message from user 9 to user 6", blocked: 0 },
	// 			{ chat_id: 2, from_id: 9, to_id: 6, msg: "6 Another message from user 9 to user 6", blocked: 0 },
	// 			{ chat_id: 2, from_id: 9, to_id: 6, msg: "7 Another message from user 9 to user 6", blocked: 0 },
	// 			{ chat_id: 2, from_id: 9, to_id: 6, msg: "8 Another message from user 9 to user 6", blocked: 0 },
	// 			{ chat_id: 2, from_id: 9, to_id: 6, msg: "9 Another message from user 9 to user 6", blocked: 0 },
	// 			{ chat_id: 2, from_id: 9, to_id: 6, msg: "10 Another message from user 9 to user 6", blocked: 0 },
	// 			{ chat_id: 2, from_id: 9, to_id: 6, msg: "11 Another message from user 9 to user 6", blocked: 0 },
	// 			{ chat_id: 2, from_id: 9, to_id: 6, msg: "12 Another message from user 9 to user 6", blocked: 0 },
	// 			{ chat_id: 2, from_id: 9, to_id: 6, msg: "13 Another message from user 9 to user 6", blocked: 0 },
	// 			{ chat_id: 2, from_id: 9, to_id: 6, msg: "14 Another message from user 9 to user 6", blocked: 0 },
	// 			{ chat_id: 2, from_id: 6, to_id: 9, msg: "Blocked 6-9 1", blocked: 1 },
	// 			{ chat_id: 2, from_id: 6, to_id: 9, msg: "Blocked 6-9 2", blocked: 1 },
	// 			{ chat_id: 2, from_id: 6, to_id: 9, msg: "Blocked 6-9 3", blocked: 1 },
	// 			{ chat_id: 2, from_id: 6, to_id: 9, msg: "1 Another message from user 6 to user 9", blocked: 0 },
	// 			{ chat_id: 2, from_id: 6, to_id: 9, msg: "2 Another message from user 6 to user 9", blocked: 0 },
	// 			{ chat_id: 2, from_id: 6, to_id: 9, msg: "3 Another message from user 6 to user 9", blocked: 0 },
				


	// 			{ chat_id: 3, from_id: 3, to_id: 9, msg: "User 3 says hi to user 9", blocked: 0 },
	// 			{ chat_id: 3, from_id: 9, to_id: 3, msg: "User 9 replies to user 3", blocked: 0 },
	// 			{ chat_id: 4, from_id: 2, to_id: 5, msg: "User 2 messaging user 5", blocked: 0 },
	// 			{ chat_id: 4, from_id: 5, to_id: 2, msg: "User 5 responding to user 2", blocked: 0 }
	// 		];
	// 		const insertMany = db.transaction((messages) => {
	// 			for (const message of messages) insert.run(message);
	// 		});
	// 		insertMany(seedData);
	// 		fastify.log.info("🌱 Seed data inserted into messages table");
	// 	} else {
	// 		fastify.log.info("🌾 Messages table already has data — skipping seed");
	// 	}
	// } catch (error) {
	// 	fastify.log.error(`❌ Failed to seed data: ${error}`);
	// 	throw error;
	// }
	//  END SEED DATA

	fastify.decorate("repositories", {
		chats: new ChatRepository(db),
		messages: new MessageRepository(db)
	});

	fastify.addHook("onClose", async () => {
		db.close();
	});
};

export default fp(repositoriesPlugin, {
	name: "repositories-plugin",
	fastify: "5.x"
});
