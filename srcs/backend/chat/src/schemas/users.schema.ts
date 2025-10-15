import { FromSchema } from "json-schema-to-ts";

export const userIdSchema = {
	type: "object",
	required: ["id"],
	properties: {
		id: { type: "number", minimum: 0 },
	},
	additionalProperties: false,
} as const;

export const chatIdSchema = {
	type: "object",
	required: ["id"],
	properties: {
		id: { type: "number", minimum: 0 },
	},
	additionalProperties: false,
} as const;

export const idArraySchema = {
	type: "object",
	required: ["ids"],
	properties: {
		ids: {
			type: "array",
			items: { type: "number", minimum: 0 },
			minItems: 1,
		},
	},
	additionalProperties: false,
} as const;

export type UserIdParams = FromSchema<typeof userIdSchema>;
export type ChatIdParams = FromSchema<typeof chatIdSchema>;
export type IdArrayParams = FromSchema<typeof idArraySchema>;
