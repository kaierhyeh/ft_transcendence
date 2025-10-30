import { InternalAuthClient } from "../clients/InternalAuthClient";
import { CONFIG } from "../config";
import { MessageRepository } from "../repositories/messages.repository";
import { sendMessageToClientWebSocket } from "../routes/ws.routes";
import { FriendshipStatus } from "../types/friendship.type";
import { NewMessage } from "../types/messages.type";

export class MessageService {

    private internalAuthClient = new InternalAuthClient();
    constructor(private messageRepository: MessageRepository) {}

    public async sendMessage(chatId:number, fromId:number, toId:number, fromUsername:string, msg:string) {

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

        const friendshipStatus = await res.json() as FriendshipStatus;
        const blocked = friendshipStatus === null ? false : friendshipStatus.status === "blocked";

		if (!blocked) {
			try {
				const newMessage: NewMessage = { chat_id: chatId, username: fromUsername, msg: msg };
				console.log(" SERVICE sendMessage: ", newMessage);
				sendMessageToClientWebSocket(toId, newMessage);
			} catch (error) {
				console.log(" SERVICE sendMessage: FAILED");
			}
		}

        await this.messageRepository.addMessage(chatId, fromId, toId, msg, blocked);
    }

}
