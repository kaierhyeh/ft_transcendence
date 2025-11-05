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

	public async getChatId(userId1: number, userId2: number): Promise<number> {
		const stmt = this.db.prepare(`
			SELECT 
				c.id AS chat_id
			FROM chats c
			WHERE (c.user_id_a = ? AND c.user_id_b = ?) OR (c.user_id_b = ? AND c.user_id_a = ?)
		`);
		const ret = stmt.get([userId1, userId2, userId1, userId2]) as { chat_id: number };
		return ret ? ret.chat_id : 0;
	}

}
