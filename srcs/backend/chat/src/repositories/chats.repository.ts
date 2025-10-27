import { Database } from "better-sqlite3";
import { MessageInfo } from "../types/messages.type";
import { ChatInfo } from "../types/chats.types";

export class ChatRepository {
	
	constructor(private db: Database) {
		this.db = db;
	}

	public async listUserChats(userId: number) {
		const stmt = this.db.prepare(`
			SELECT 
				c.id AS chat_id,
				c.user_id_a AS from_id,
				c.user_id_b AS to_id,
				(
					SELECT MAX(m.id)
					FROM messages m
					WHERE m.chat_id = c.id
					AND NOT (m.to_id = :userId AND m.blocked = 1)
				) AS last_msg_id
			FROM chats c
			WHERE (c.user_id_a = :userId OR c.user_id_b = :userId)
			AND EXISTS (
					SELECT 1
					FROM messages m
					WHERE m.chat_id = c.id
					AND NOT (m.to_id = :userId AND m.blocked = 1)
			)
			ORDER BY last_msg_id DESC
		`);
		return stmt.all({ userId }) as ChatInfo[];
	}

	public async getChatByUsersIds(thisUserId: number, userId: number) {
		const stmt = this.db.prepare(`
			SELECT 
				c.id AS chat_id,
				c.user_id_a AS from_id,
				c.user_id_b AS to_id
			FROM chats c
			WHERE (c.user_id_a = ? AND c.user_id_b = ?) OR (c.user_id_b = ? AND c.user_id_a = ?)
		`);
		const ret = stmt.get([thisUserId, userId, thisUserId, userId]) as ChatInfo;
		return ret ? ret : null;
	}

	public async addChat(thisUserId: number, userId: number): Promise<ChatInfo> {
		const stmt = this.db.prepare(`
			INSERT INTO chats (user_id_a, user_id_b)
			VALUES (?, ?)
			RETURNING 
				id AS chat_id, 
				user_id_a AS from_id, 
				user_id_b AS to_id
		`);
		return stmt.get(thisUserId, userId) as ChatInfo;
	}

	public async getChatById(chatId: number, thisUserId: number) {
		const stmt = this.db.prepare(`
			SELECT 
				m.id AS msg_id,
				m.chat_id AS chat_id,
				m.from_id AS from_id,
				m.to_id AS to_id,
				m.msg AS msg
			FROM messages m
			WHERE m.chat_id = ?
				AND NOT (m.to_id = ? AND m.blocked = 1)
			ORDER BY m.id ASC
		`);
		return stmt.all([chatId, thisUserId]) as MessageInfo[];
	}

}
