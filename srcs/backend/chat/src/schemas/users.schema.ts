import { FromSchema } from "json-schema-to-ts";

export const userId = {
	type: "object",
	required: ["id"],
	properties: {
		id: { type: "number" },
	},
	additionalProperties: false,
} as const;

export type GameParticipant = FromSchema<typeof userId>;
