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

export type NewMessageBody = FromSchema<typeof newMessageSchema>;
