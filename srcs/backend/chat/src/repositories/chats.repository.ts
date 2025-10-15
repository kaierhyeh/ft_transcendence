// // data access layer (DAL)

// 

// import database from "../db/database";
// import { logError } from "../utils/errorHandler";
// import { colorLog } from "../utils/logger";

// export interface ChatListRow {
// 	chat_id: number;
// 	user_id: number;
// 	username: string;
// }


// // get chat id of two users
// // return null if no chat 
// export async function getChatId(userA:number, userB:number):Promise<number|null> {
// 	return new Promise((resolve, reject) => {
		
// 		const query = `
// 		SELECT id FROM chats
// 		WHERE (user_a_id = ? AND user_b_id = ?)
// 		OR (user_b_id = ? AND user_a_id = ?)`;
		
// 		database.get(query, [userA, userB, userB, userA], (e:Error|null, data:{id:number}|undefined) => {
// 			if (e) {
// 				logError(e, "getChatId");
// 				return (reject(e));
// 			}
// 			resolve(data ? data.id : null)
// 		});
		
// 	});
// }

// // get users with whom user has chats
// export async function getChatPartners(userId:number) {
// 	colorLog("cyan", `getChatPartners for userId=${userId}`);
// 	return new Promise((resolve, reject) => {

// 		// this query collect chat partners IDs and usernames

// 		const query = `
// 			SELECT DISTINCT 
// 				c.id AS chat_id,
// 				u.id AS user_id, 
// 				u.username
// 			FROM chats c
// 			JOIN users u
// 				ON (u.id = c.user_id_a AND c.user_id_b = ?)
// 				OR (u.id = c.user_id_b AND c.user_id_a = ?)
// 			ORDER BY u.username ASC`;

// 		database.all(query, [userId, userId], (e:Error|null, data) => {
// 			if (e) {
// 				logError(e, "getChatPartners");
// 				return (reject(e));
// 			}
// 			resolve(data);
// 		});

// 	});
// }

// // add new chat in database
// export async function postChat(userA:number, userB:number): Promise<number>{
// 	return new Promise((resolve, reject) => {

// 		const query = `
// 			INSERT INTO chats (user_a_id, user_b_id)
// 			VALUES (?, ?)`;

// 		database.run(query, [userA, userB], function (e) {
// 			if (e) {
// 				logError(e, "postChat");
// 				return (reject(e));
// 			}
// 			// return the id of the new chat
// 			resolve(this.lastID); 
// 		});

// 	});
// }

// export async function deleteChatById(chatId:number) {
// 	return new Promise((resolve, reject) => {

// 		const query = `
// 			DELETE FROM chats
// 			WHERE id = ?`;

// 		database.run(query, [chatId], function (e:Error|null) {
// 			if (e) {
// 				logError(e, "deleteChatById");
// 				return (reject(e));
// 			}
// 			// return the chat id
// 			resolve(chatId); 
// 		});

// 	});
// }


import { Database } from "better-sqlite3";

export interface ChatInfo {
	chat_id: number;
	from_id: number;
	to_id: number;
}

export interface MessageInfo {
	msg_id: number;
	chat_id: number;
	from_id: number;
	to_id: number;
	msg: string;
}

export class ChatRepository {
	constructor(private db: Database) {
		this.db = db;
	}

	public async listUserChats(userId: number) {
		const stmt = this.db.prepare(`
			SELECT 
				c.id AS chat_id,
				c.user_id_a AS from_id,
				c.user_id_b AS to_id
			FROM chats c
			WHERE (c.user_id_a = ?) OR (c.user_id_b = ?)
			ORDER BY c.id ASC
		`);
		return stmt.all([userId, userId]) as ChatInfo[];
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

