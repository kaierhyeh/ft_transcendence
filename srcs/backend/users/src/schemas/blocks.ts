import { FromSchema } from "json-schema-to-ts";

export const userIdSchema = {
	type: "object",
	required: ["id"],
	properties: {
		id: { type: "number", minimum: 0 },
	},
	additionalProperties: false,
} as const;

export type UserIdParams = FromSchema<typeof userIdSchema>;
