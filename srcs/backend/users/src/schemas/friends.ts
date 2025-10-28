import { FromSchema } from "json-schema-to-ts";

export const userIdSchema = {
	type: "object",
	required: ["id"],
	properties: {
		id: { type: "number", minimum: 0 },
	},
	additionalProperties: false,
} as const;

export const friendshipIdSchema = {
	type: "object",
	required: ["id"],
	properties: {
		id: { type: "number", minimum: 0 },
	},
	additionalProperties: false,
} as const;

export const userIdsSchema = {
  type: "object",
  required: ["id", "ids"],
  properties: {
	id: { 
		type: "number", 
		minimum: 0 
	},
    ids: {
      type: "array",
      items: { type: "number", minimum: 0 },
      minItems: 0
    },
  },
  additionalProperties: false,
} as const;

export const batchUserIdsSchema = {
  type: "object",
  required: ["user_ids"],
  properties: {
    user_ids: {
      type: "array",
      items: { type: "number", minimum: 0 },
      minItems: 1
    },
  },
  additionalProperties: false,
} as const;

export const friendshipParamsSchema = {
	type: "object",
	required: ["userId", "friendId"],
	properties: {
		userId: {
			type: "number",
			minimum: 0
		},
		friendId: {
			type: "number",
			minimum: 0
		},
	},
	additionalProperties: false
} as const;

export type FriendshipParams = FromSchema<typeof friendshipParamsSchema>;
export type UserIdParams = FromSchema<typeof userIdSchema>;
export type FriendshipIdParams = FromSchema<typeof friendshipIdSchema>;
export type UserIdsBody = FromSchema<typeof userIdsSchema>;
export type BatchUserIdsBody = FromSchema<typeof batchUserIdsSchema>;