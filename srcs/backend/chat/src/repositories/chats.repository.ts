// data access layer (DAL)

import database from "../db/database";
import { logError } from "../utils/errorHandler";

// to use as type for data
// data:Message[] - if its list of messages
import { Message } from "../types/messages.type";
import { colorLog } from "../utils/logger";

// get chat id of two users
// return null if no chat 
export async function getChatId(userA:number, userB:number):Promise<number|null> {
	return new Promise((resolve, reject) => {
		
		const query = `
		SELECT id FROM chats
		WHERE (user_a_id = ? AND user_b_id = ?)
		OR (user_b_id = ? AND user_a_id = ?)`;
		
		database.get(query, [userA, userB, userB, userA], (e:Error|null, data:{id:number}|undefined) => {
			if (e) {
				logError(e, "getChatId");
				return (reject(e));
			}
			resolve(data ? data.id : null)
		});
		
	});
}

// get users with whom user has chats
export async function getChatPartners(userId:number) {
	colorLog("cyan", `getChatPartners for userId=${userId}`);
	return new Promise((resolve, reject) => {

		// this query collect chat partners IDs and usernames

		const query = `
			SELECT u.id, u.username
			FROM users u
			JOIN messages m ON u.id = m.from_id OR u.id = m.to_id
			WHERE u.id = ?
			ORDER BY u.username ASC`;

		database.all(query, [userId], (e:Error|null, data) => {
			if (e) {
				logError(e, "getChatPartners");
				return (reject(e));
			}
			resolve(data);
		});

	});
}

// add new chat in database
export async function postChat(userA:number, userB:number): Promise<number>{
	return new Promise((resolve, reject) => {

		const query = `
			INSERT INTO chats (user_a_id, user_b_id)
			VALUES (?, ?)`;

		database.run(query, [userA, userB], function (e) {
			if (e) {
				logError(e, "postChat");
				return (reject(e));
			}
			// return the id of the new chat
			resolve(this.lastID); 
		});

	});
}

export async function deleteChatById(chatId:number) {
	return new Promise((resolve, reject) => {

		const query = `
			DELETE FROM chats
			WHERE id = ?`;

		database.run(query, [chatId], function (e:Error|null) {
			if (e) {
				logError(e, "deleteChatById");
				return (reject(e));
			}
			// return the chat id
			resolve(chatId); 
		});

	});
}

