import { Database } from "better-sqlite3";

export class MessageRepository{
	
	constructor(private db: Database) {
		this.db = db;
	}

	public async addMessage(chatId:number, fromId:number, toId:number, msg:string, blocked: boolean) {
		const stmt = this.db.prepare(`
			INSERT INTO messages (chat_id, from_id, to_id, msg, blocked)
			VALUES (?, ?, ?, ?, ?)
		`);
		stmt.run(chatId, fromId, toId, msg, blocked ? 1 : 0);
	}

}
