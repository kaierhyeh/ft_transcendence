import { InternalAuthClient } from "../clients/InternalAuthClient";
import { CONFIG } from "../config";
import { ChatRepository } from "../repositories/chats.repository";

export interface chatListRow {
	chat_id: number;
	user_id: number;
	username: string;
	alias: string | null;
	user_status: string | null;
	friendship_status: string | null;
	from: number | null;
}

export interface ChatInfo {
	chat_id: number;
	from_id: number;
	to_id: number;
}

export interface UserInfo {
	user_id: number;
	username: string;
	alias: string;
	user_status: string;
	friendship_status: string | null;
	from: number | null;
};


export class ChatService {
	constructor(private chatRepository: ChatRepository) {}	

	
	public async getUserChats(userId: number) {
		// user exist
		// no -> delete chats with this user
		
		let baseUrl = CONFIG.USER_SERVICE.BASE_URL;
		// let internalAuthClient = new InternalAuthClient();
		const chatsInfo = await this.chatRepository.listUserChats(userId);
		const userIds = chatsInfo.map(c => (c.from_id !== userId ? c.from_id : c.to_id));

		const body = { id: userId, ids: userIds };
		// ------------------------------- HERE ------------------------------- PROBLEM WITH CONNECTION BETWEEN SERVICES with TOKENS
		// const internalAuthHeaders = await this.internalAuthClient.getAuthHeaders();

		const res = await fetch(
			`${baseUrl}/friends/usersChat`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
					// ...internalAuthHeaders
				},
				body: JSON.stringify(body)
			}
		);

		if (!res.ok) {
			throw new Error(`Failed to fetch users data: ${res.status} ${res.statusText}`);
		}

		const usersData = (await res.json()) as UserInfo[];

		// combine into final array

		const userMap = new Map<number, UserInfo>();
		for (const user of usersData) {
			userMap.set(user.user_id, user);
		}
		
		const chats: chatListRow[] = [];

		for (const c of chatsInfo) {
			const otherUserId = c.from_id !== userId ? c.from_id : c.to_id;
			const u = userMap.get(otherUserId);
			if (!u) continue;

			let user_status = u.user_status;
			let friendship_status = u.friendship_status;
			let from: number | null = u.from;

			// Apply conditions
			if (friendship_status === null || friendship_status === "pending") {
				user_status = "unknown";
				friendship_status = null;
				from = null;
			} else if (friendship_status === "blocked") {
				user_status = "unknown";
			}

			chats.push({
				chat_id: c.chat_id,
				user_id: u.user_id,
				username: u.username,
				alias: u.alias,
				user_status,
				friendship_status,
				from
			});
		}

		chats.sort((a, b) => a.username.localeCompare(b.username));

		return chats;
	}

	public async getChatById(chatId: number, thisUserId: number) {
		return this.chatRepository.getChatById(chatId, thisUserId);
	}
}
