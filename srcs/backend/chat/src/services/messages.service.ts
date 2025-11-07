import { InternalAuthClient } from "../clients/InternalAuthClient";
import { CONFIG } from "../config";
import { MessageRepository } from "../repositories/messages.repository";
import { sendMessageToClientWebSocket } from "../routes/ws.routes";
import { FriendshipStatus } from "../types/friendship.type";
import { NewGame, NewMessage } from "../types/messages.type";

export class MessageService {

    private internalAuthClient = new InternalAuthClient();
    constructor(private messageRepository: MessageRepository) {}

	async isBlocked(fromId: number, toId: number): Promise<boolean> {

		const baseUrl = CONFIG.USER_SERVICE.BASE_URL;
		const internalAuthHeaders = await this.internalAuthClient.getAuthHeaders();

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
		return friendshipStatus === null ? false : friendshipStatus.status === "blocked";

	}
	
    public async sendMessage(chatId:number, fromId:number, toId:number, fromUsername:string, msg:string) {

		// use opposite friendship direction to find is this user (from) blocked by another
		const blocked = await this.isBlocked(fromId, toId);

		if (!blocked) {
			try {
				const newMessage: NewMessage = { chat_id: chatId, username: fromUsername, msg: msg };
				console.log(" SERVICE sendMessage: ", newMessage);
				sendMessageToClientWebSocket(toId, newMessage, "chat_message");
			} catch (error) {
				console.log(" SERVICE sendMessage: FAILED");
			}
		}

        await this.messageRepository.addMessage(chatId, fromId, toId, msg, blocked);
    }

	public async notifyAboutGame(fromId: number, toId: number, gameId: number) {
		const fromIsBlocked = await this.isBlocked(fromId, toId);
		const chatId = await this.messageRepository.getChatId(fromId, toId);
		console.log(" SERVICE notifyAboutGame: chatID=", chatId);
		console.log(" SERVICE notifyAboutGame: fromID=", fromId);
		console.log(" SERVICE notifyAboutGame:   toID=", toId);
		console.log(" SERVICE notifyAboutGame: gameID=", gameId);

		const newGame: NewGame = { chat_id: chatId, game_id: gameId };

		if (!fromIsBlocked && chatId !== 0) {
			try {
				console.log(" SERVICE notifyAboutGame: ", newGame);
				if (!sendMessageToClientWebSocket(toId, newGame, "game_created")) {
					sendMessageToClientWebSocket(fromId, newGame, "invite_failed");
				} else {
					sendMessageToClientWebSocket(fromId, newGame, "game_created");
				}
			} catch (error) {
				console.log(" SERVICE notifyAboutGame: FAILED");
			}
		} else {
			sendMessageToClientWebSocket(fromId, newGame, "invite_failed");
		}

	}

}
