// info about chat and second person in chat
export interface chatListRow {
	chat_id: number;
	user_id: number;
	username: string;
	alias: string | null;
	user_status: string | null;
	friendship_status: string | null;
	from: number | null;
	avatar_updated_at: string | null;
}

// info adout chat
export interface ChatInfo {
	chat_id: number;
	from_id: number;
	to_id: number;
}

// info about with whom
export interface UserInfo {
	user_id: number;
	username: string;
	alias: string;
	user_status: string | null;
	friendship_status: string | null;
	from_id: number | null;
	avatar_updated_at: string | null;
}
