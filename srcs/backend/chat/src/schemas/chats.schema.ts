import { FromSchema } from "json-schema-to-ts";

export const chatIdSchema = {
	type: "object",
	required: ["id"],
	properties: {
		id: { type: "number", minimum: 0 },
	},
	additionalProperties: false,
} as const;

export type ChatIdParams = FromSchema<typeof chatIdSchema>;
