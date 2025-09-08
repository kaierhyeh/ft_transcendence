// data access layer (DAL)

import database from "../db/database";
import { logError } from "../utils/errorHandler";

// to use as type for data
// data:Message[] - if its list of messages
import { Message } from "../types/messages.type";

// get all messages from/to user with userId
export async function getMessagesByUserId(userId:number) {
	return new Promise((resolve, reject) => {

		const query = `
			SELECT * FROM messages
			WHERE (from_id = ? OR to_id = ?)
			ORDER BY id ASC`;

		database.all(query, [userId, userId], (e:Error|null, data) => {
			if (e) {
				logError(e, "getMessagesByUserId");
				return (reject(e));
			}
			resolve(data);
		});

	});
}

// add new mesage in database
export async function newMessage(chatId:number, fromId:number, toId:number, msg:string) {
	return new Promise((resolve, reject) => {

		const query = `
			INSERT INTO messages (chat_id, from_id, to_id, msg)
			VALUES (?, ?, ?, ?)`;

		database.run(query, [chatId, fromId, toId, msg], function (e:Error|null) {
			if (e) {
				logError(e, "newMessage");
				return (reject(e));
			}
			// return the msg info with id
			resolve({ id: this.lastID, chatId, fromId, toId, msg}); 
		});

	});
}

export async function deleteMessageById(msgId:number) {
	return new Promise((resolve, reject) => {

		const query = `
			DELETE FROM messages
			WHERE id = ?`;

		database.run(query, [msgId], function (e:Error|null) {
			if (e) {
				logError(e, "deleteMessageById");
				return (reject(e));
			}
			// return the msg id
			resolve(msgId); 
		});

	});
}
