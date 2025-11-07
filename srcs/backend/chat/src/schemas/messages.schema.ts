import { FromSchema } from "json-schema-to-ts";

export const newMessageSchema = {
	type: "object",
	required: ["chatId", "toId", "msg"],
	properties: {
		chatId: {
			type: "number",
			minimum: 0
		},
		toId: {
			type: "number",
			minimum: 0 
		},
		fromUsername: {
			type: 'string',
			minLength: 1
		},
		msg: {
			type: 'string',
			minLength: 1
		}
	},
	additionalProperties: false,
} as const;

export const gameInfoSchema = {
	type: "object",
	required: ["fromId", "toId", "gameId"],
	properties: {
		fromId: { type: "number", minimum: 1 },
		toId: { type: "number", minimum: 1 },
		gameId: { type: "number", minimum: 1 },
	},
	additionalProperties: false,
} as const;

export type NewMessageBody = FromSchema<typeof newMessageSchema>;
export type GameInfoParams = FromSchema<typeof gameInfoSchema>;
