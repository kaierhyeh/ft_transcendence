// // the service layer (business logic)
// // functions that operate on chats

// import	{
// 		getChatId,
// 		postChat
// 		} from "../repositories/chats.repository";

// import	{
// 		getMessagesByUserId,
// 		postMessage, 
// 		deleteMessageById
// 		} from "../repositories/messages.repository";

// import	{
// 		chatDatabaseError,
// 		chatNotFoundError,
// 		chatValidationError
// 		} from "../utils/errors";

// import	{
// 		logError
// 		} from "../utils/errorHandler";
// import { colorLog } from "../utils/logger";

// export async function postMessageService(fromId: number, toId: number, msg: string) {
// 	try {
// 		if (fromId == null || toId == null || !msg?.trim())
// 			throw chatValidationError("Missing required fields", { fromId, toId, msg });
// 		let chatId = await getChatId(fromId, toId);
// 		if (chatId === null)
// 			chatId = await postChat(fromId, toId);
// 		if (!chatId)
// 			throw chatDatabaseError("Database did not return a valid chatId", { fromId, toId });
// 		const newMsg = await postMessage(chatId, fromId, toId, msg);
// 		return (newMsg);
// 	} catch (e: any) {
// 		logError(e, "postMessageService");
// 		throw chatDatabaseError("Failed to send message", { fromId, toId });
// 	}
// }

// export async function getMessagesService(chatId: number, userId: number) {
// 	colorLog("cyan", "getMessagesService: chatId=", chatId, " userId=", userId);
// 	try {
// 		const msgs = await getMessagesByUserId(chatId, userId);
// 		if (!msgs)
// 			throw chatNotFoundError("Messages for user not found");
// 		return (msgs);
// 	} catch (e: any) {
// 		logError(e, "getMessagesService");
// 		throw chatDatabaseError("Failed to fetch messages for user by user ID", { userId });
// 	}
// }

// // Delete msg by its ID number
// export async function deleteMessageService(msgId: number) {
// 	try {
// 		await deleteMessageById(msgId);
// 	} catch (e: any) {
// 		logError(e, "deleteMessageService");
// 		throw chatDatabaseError("Failed to delete message by ID", { msgId });
// 	}
// }

import { InternalAuthClient } from "../clients/InternalAuthClient";
import { CONFIG } from "../config";
import { MessageRepository } from "../repositories/messages.repository";

export interface FriendshipStatus {
	status: string | null;
}

export class MessageService {

    private internalAuthClient = new InternalAuthClient();

    constructor(private messageRepository: MessageRepository) {}

    public async sendMessage(chatId:number, fromId:number, toId:number, msg:string) {

        const baseUrl = CONFIG.USER_SERVICE.BASE_URL;
        const internalAuthHeaders = await this.internalAuthClient.getAuthHeaders();
        // use opposit friendship direction to find is this user (from) blocked by another
        const res = await fetch(
            `${baseUrl}/friends/status/${toId}/${fromId}`,
			{
				method: 'GET',
				headers: {
					...internalAuthHeaders
				},
			}
        );
        if (!res.ok) {
            throw new Error(`Failed to fetch friendship status: ${res.status} ${res.statusText}`);
        }
        console.log("[DEBUG]:res=", res);
        const friendshipStatus = (await res.json()) as FriendshipStatus;
        console.log("[DEBUG]:status=", friendshipStatus);
        const blocked = friendshipStatus.status === 'blocked' ? true : false;
        console.log("[DEBUG]:blocked=", blocked);

        await this.messageRepository.addMessage(chatId, fromId, toId, msg, blocked);
    }

}