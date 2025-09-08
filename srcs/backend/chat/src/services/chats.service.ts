// the service layer (business logic)
// functions that operate on chats

import	{
		getChatPartners, 
		deleteChatById, 
		} from "../repositories/chats.repository";

import	{
		chatDatabaseError,
		chatNotFoundError,
		} from "../utils/errors";

import	{
		logError
		} from "../utils/errorHandler";

// Det users with whom user has chats
// !!! In DAL need to JOIN correctly with table "users" 
export async function getChatPartnersService(userId: number) {
	try {
		const users = await getChatPartners(userId);
		if (!users)
			throw chatNotFoundError("Chats partners for user not found");
		return(users);
	} catch (e: any) {
		logError(e, "getChatPartnersService");
		throw chatDatabaseError("Failed to fetch chats partners for user by user ID", { userId });
	}
}

// Delete chat by its ID number
export async function deleteChatService(chatId: number) {
	try {
		await deleteChatById(chatId);
	} catch (e: any) {
		logError(e, "deleteChatService");
		throw chatDatabaseError("Failed to delete chat by ID", { chatId });
	}
}
