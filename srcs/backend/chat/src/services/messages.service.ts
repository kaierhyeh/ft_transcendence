import { InternalAuthClient } from "../clients/InternalAuthClient";
import { CONFIG } from "../config";
import { MessageRepository } from "../repositories/messages.repository";

export interface FriendshipStatus {
	status: string | null;
    from_id: number | null;
	to_id: number | null;
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

        const friendshipStatus = await res.json() as FriendshipStatus;
        const blocked = friendshipStatus === null ? false : friendshipStatus.status === "blocked";

        await this.messageRepository.addMessage(chatId, fromId, toId, msg, blocked);
    }

}