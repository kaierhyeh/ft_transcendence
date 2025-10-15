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

export type UserIdParams = FromSchema<typeof userIdSchema>;
export type FriendshipIdParams = FromSchema<typeof friendshipIdSchema>;
export type UserIdsBody = FromSchema<typeof userIdsSchema>;