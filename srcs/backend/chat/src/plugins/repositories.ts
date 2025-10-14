import { FastifyPluginAsync } from "fastify";
import Database from "better-sqlite3";
import { CONFIG } from "../config";
import fp from "fastify-plugin";
import { join, dirname } from "path";
import { readFileSync, mkdirSync } from "fs";
import { ChatRepository } from "../repositories/chats.repository";
// import { MessageRepository } from "../repositories/messages.repository";

declare module "fastify" {
	interface FastifyInstance {
		repositories: {
			chats: ChatRepository;
			// messages: MessageRepository;
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

	// somewhere here I can I add SEED DATA

	fastify.decorate("repositories", {
		chats: new ChatRepository(db)
	});

	fastify.addHook("onClose", async () => {
		db.close();
	});
};

export default fp(repositoriesPlugin, {
	name: "repositories-plugin",
	fastify: "5.x"
});
