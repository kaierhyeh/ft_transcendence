export interface jwtDTO {
	userId: number;
}

export interface dataDTO {
	type: string;
	payload: {
		fromId: number;
		toId: number;
		msg: string;
	};
}

