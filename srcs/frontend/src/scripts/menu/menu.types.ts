export interface UserListRow {
	user_id: number;
	username: string;
	alias: string | null;
	avatar_filename: string;
	friendship_status: string | null;
	avatar_updated_at: string;
}

export interface UserInfo {
	user_id: number;
	username: string;
	alias: string | null;
	avatar_filename: string;
	friendship_status: string | null;
	from_id: number | null;
	to_id: number | null;
	avatar_updated_at: string;
}

export interface Message {
	msg_id: number;
	chat_id: number;
	from_id: number;
	to_id: number;
	msg: string;
}

export interface NewMessage {
	chat_id: number;
	username: string;
	msg: string;
}

export interface NewMessageRequest {
	chatId: number;
	toId: number;
	fromUsername: string;
	msg: string;
}

export interface NewMessageResponse {
	messageId: number;
	chatId: number;
	fromId: number;
	toId: number;
	msg: string;
}

export interface NewGame {
	chat_id: number;
	game_id: number;
}

export interface ChatUser {
	chat_id: number;
	user_id: number;
	username: string;
	alias: string | null;
	friendship_status: string | null;
	from: number | null;
	avatar_updated_at: string;
}
