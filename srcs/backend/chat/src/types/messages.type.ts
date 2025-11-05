export interface MessageInfo {
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

export interface NewGame {
	chat_id: number;
	game_id: number;
}
