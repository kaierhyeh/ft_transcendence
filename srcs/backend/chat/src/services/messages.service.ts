// the service layer (business logic)
// functions that operate on chats

import	{
		getChatId,
		postChat
		} from "../repositories/chats.repository";

import	{
		getMessagesByUserId,
		postMessage, 
		deleteMessageById
		} from "../repositories/messages.repository";

import	{
		chatDatabaseError,
		chatNotFoundError,
		chatValidationError
		} from "../utils/errors";

import	{
		logError
		} from "../utils/errorHandler";

export async function postMessageService(fromId: number, toId: number, msg: string) {
	try {
		if (fromId == null || toId == null || !msg?.trim())
			throw chatValidationError("Missing required fields", { fromId, toId, msg });
		let chatId = await getChatId(fromId, toId);
		if (chatId === null)
			chatId = await postChat(fromId, toId);
		if (!chatId)
			throw chatDatabaseError("Database did not return a valid chatId", { fromId, toId });
		const newMsg = await postMessage(chatId, fromId, toId, msg);
		return (newMsg);
	} catch (e: any) {
		logError(e, "postMessageService");
		throw chatDatabaseError("Failed to send message", { fromId, toId });
	}
}

export async function getMessagesService(userId: number) {
	try {
		const msgs = await getMessagesByUserId(userId);
		if (!msgs)
			throw chatNotFoundError("Messages for user not found");
		return (msgs);
	} catch (e: any) {
		logError(e, "getMessagesService");
		throw chatDatabaseError("Failed to fetch messages for user by user ID", { userId });
	}
}

// Delete msg by its ID number
export async function deleteMessageService(msgId: number) {
	try {
		await deleteMessageById(msgId);
	} catch (e: any) {
		logError(e, "deleteMessageService");
		throw chatDatabaseError("Failed to delete message by ID", { msgId });
	}
}
