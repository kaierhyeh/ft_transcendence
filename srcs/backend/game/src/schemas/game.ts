import { FromSchema } from "json-schema-to-ts";

export const playerSchema = {
  type: "object",
  required: ["player_id", "match_ticket"],
  properties: {
    player_id: { type: "number" },
    match_ticket: { type: "string" },
  },
  additionalProperties: false,
} as const;

export const gameIdSchema = {
  type: "object",
    required: ["id"],
    properties: {
      id: { type: "number" },
    },
    additionalProperties: false,
} as const;

export const createGameSchema = {
  type: "object",
  required: ["type", "participants"],
  properties: {
    type: {
      type: "string",
      enum: ["pvp", "multi", "tournament"],
    },
    participants: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: playerSchema,
    },
  },
  additionalProperties: false,
} as const;

// 👇 Types derived from schemas
export type GameParticipant = FromSchema<typeof playerSchema>;
export type GameIdParams = FromSchema<typeof gameIdSchema>;
export type GameCreationBody = FromSchema<typeof createGameSchema>;
export type GameType = GameCreationBody["type"];
