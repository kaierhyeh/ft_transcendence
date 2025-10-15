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
	user_status: string | null;
	friendship_status: string | null;
	from_id: number | null;
};


export class ChatService {

	private internalAuthClient = new InternalAuthClient();

	constructor(private chatRepository: ChatRepository) {}	

	public async getUserChats(userId: number) {
		// user exist
		// no -> delete chats with this user
		
		let baseUrl = CONFIG.USER_SERVICE.BASE_URL;
		const chatsInfo = await this.chatRepository.listUserChats(userId);
		const userIds = chatsInfo.map(c => (c.from_id !== userId ? c.from_id : c.to_id));
		const body = { id: userId, ids: userIds };
		const internalAuthHeaders = await this.internalAuthClient.getAuthHeaders();

		const res = await fetch(
			`${baseUrl}/friends/usersChat`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...internalAuthHeaders
				},
				body: JSON.stringify(body)
			}
		);
		if (!res.ok) {
			throw new Error(`Failed to fetch users data: ${res.status} ${res.statusText}`);
		}

		const usersData = (await res.json()) as UserInfo[];
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
			let from: number | null = u.from_id;

			switch (friendship_status) {
				case "blocked":
					if (u.user_id !== from) {
						// user_id was blocked by this user
						chats.push({
							chat_id: c.chat_id,
							user_id: u.user_id,
							username: u.username,
							alias: u.alias,
							user_status: null,
							friendship_status,
							from
						});
					} else {
						// this user was blocked by user_id, hide status and friendship from frontend
						chats.push({
							chat_id: c.chat_id,
							user_id: u.user_id,
							username: u.username,
							alias: u.alias,
							user_status: null,
							friendship_status: null,
							from: null
						});
					}
					break;
				case "accepted":
					chats.push({
						chat_id: c.chat_id,
						user_id: u.user_id,
						username: u.username,
						alias: u.alias,
						user_status,
						friendship_status,
						from
					});
					break;
				default:
					chats.push({
						chat_id: c.chat_id,
						user_id: u.user_id,
						username: u.username,
						alias: u.alias,
						user_status: null,
						friendship_status: null,
						from: null
					});
					break;
			}
		}

		chats.sort((a, b) => a.username.localeCompare(b.username));

		return chats;
	}

	public async getChatById(chatId: number, thisUserId: number) {
		return this.chatRepository.getChatById(chatId, thisUserId);
	}
}
