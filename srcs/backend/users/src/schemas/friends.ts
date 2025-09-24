import { FromSchema } from "json-schema-to-ts";

export const userIdSchema = {
	type: "object",
	required: ["id"],
	properties: {
		id: { type: "number" },
	},
	additionalProperties: false,
} as const;

export const friendshipIdSchema = {
	type: "object",
	required: ["id"],
	properties: {
		id: { type: "number" },
	},
	additionalProperties: false,
} as const;

export type UserIdParams = FromSchema<typeof userIdSchema>;
export type FriendshipIdParams = FromSchema<typeof friendshipIdSchema>;