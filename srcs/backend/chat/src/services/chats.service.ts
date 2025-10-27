import { InternalAuthClient } from "../clients/InternalAuthClient";
import { CONFIG } from "../config";
import { ChatRepository } from "../repositories/chats.repository";
import { UserInfo, chatListRow, ChatInfo } from "../types/chats.types";

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
							from,
							avatar_updated_at: u.avatar_updated_at
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
							from: null,
							avatar_updated_at: u.avatar_updated_at
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
						from,
						avatar_updated_at: u.avatar_updated_at
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
						from: null,
						avatar_updated_at: u.avatar_updated_at
					});
					break;
			}
		}

		// chats.sort((a, b) => a.username.localeCompare(b.username));

		return chats;
	}

	private async getUserChatListRow(thisUserId: number, userId: number, chatInfo: ChatInfo): Promise<chatListRow | undefined> {

		const baseUrl = CONFIG.USER_SERVICE.BASE_URL;
		const body = { id: thisUserId, ids: [userId] };
		const internalAuthHeaders = await this.internalAuthClient.getAuthHeaders();

		const res = await fetch(`${baseUrl}/friends/usersChat`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...internalAuthHeaders
			},
			body: JSON.stringify(body)
		});

		if (!res.ok) {
			throw new Error(`Failed to fetch users data: ${res.status} ${res.statusText}`);
		}

		const usersData = (await res.json()) as UserInfo[];
		const user = usersData.find(u => u.user_id === userId);

		if (user) {
			let user_status = user.user_status;
			let friendship_status = user.friendship_status;
			let from: number | null = user.from_id;

			switch (friendship_status) {
				case "blocked":
					if (user.user_id !== from) {
						// user_id was blocked by this user
						return {
							chat_id: chatInfo.chat_id,
							user_id: user.user_id,
							username: user.username,
							alias: user.alias,
							user_status: null,
							friendship_status,
							from,
							avatar_updated_at: user.avatar_updated_at
						};
					} else {
						// this user was blocked by user_id
						return {
							chat_id: chatInfo.chat_id,
							user_id: user.user_id,
							username: user.username,
							alias: user.alias,
							user_status: null,
							friendship_status: null,
							from: null,
							avatar_updated_at: user.avatar_updated_at
						};
					}
				case "accepted":
					return {
						chat_id: chatInfo.chat_id,
						user_id: user.user_id,
						username: user.username,
						alias: user.alias,
						user_status,
						friendship_status,
						from,
						avatar_updated_at: user.avatar_updated_at
					};
				default:
					return {
						chat_id: chatInfo.chat_id,
						user_id: user.user_id,
						username: user.username,
						alias: user.alias,
						user_status: null,
						friendship_status: null,
						from: null,
						avatar_updated_at: user.avatar_updated_at
					};
			}
		}

		return undefined;
	}

	public async getUserChat(thisUserId: number, userId: number) {
		let chatInfo = await this.chatRepository.getChatByUsersIds(thisUserId, userId);
		if (chatInfo === null) {
			chatInfo = await this.chatRepository.addChat(thisUserId, userId);
		}
		return await this.getUserChatListRow(thisUserId, userId, chatInfo);
	}

	public async getChatById(chatId: number, thisUserId: number) {
		return this.chatRepository.getChatById(chatId, thisUserId);
	}
}
