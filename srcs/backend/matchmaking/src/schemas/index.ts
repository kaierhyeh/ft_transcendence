import { FromSchema } from "json-schema-to-ts";

export const participantSchema = {
  type: "object",
  required: ["type"],
  properties: {
    type: {
      type: "string",
      enum: ["registered", "guest", "ai"],
    },
    user_id: { type: "number" },
  },
  additionalProperties: false,
} as const;

export const matchMakingSchema = {
  type: "object",
  required: ["mode", "participants"],
  properties: {
    mode: {
      type: "string",
      enum: ["pvp", "multi"],
    },
    participants: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: participantSchema,
    },
  },
  additionalProperties: false,
} as const;

// 👇 Types derived from schemas
export type MatchParticipant = FromSchema<typeof participantSchema>;
export type MatchMakingData = FromSchema<typeof matchMakingSchema>;
export type GameMode = MatchMakingData["mode"];
export type PlayerType = MatchParticipant["type"];