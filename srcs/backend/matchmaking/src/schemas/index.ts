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
  required: ["format", "mode", "participants"],
  properties: {
    format: {
        type: "string",
        enum: ["1v1", "2v2"]
    },
    tournament_id: { type: "number"},
    mode: {
      type: "string",
      enum: ["solo", "pvp", "tournament"],
    },
    participants: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: participantSchema,
    },
    online: {
      type: "boolean",
      default: false
    },
  },
  additionalProperties: false,
} as const;

// 👇 Types derived from schemas
export type MatchParticipant = FromSchema<typeof participantSchema>;
export type MatchMakingData = FromSchema<typeof matchMakingSchema>;
export type GameMode = MatchMakingData["mode"];
export type GameFormat = MatchMakingData["format"];
export type PlayerType = MatchParticipant["type"];