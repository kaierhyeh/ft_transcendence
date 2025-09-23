import { FromSchema } from "json-schema-to-ts";

export const playerSchema = {
  type: "object",
  required: ["user_id", "participant_id"],
  properties: {
    user_id: { type: "number" },
    participant_id: { type: "string" },
    is_ai: { type: "boolean" },
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
      enum: ["solo", "pvp", "multi", "tournament"],
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


//REMOTE_PLAYER_ADD
export const matchmakingRequestSchema = {
  type: "object",
  required: ["type", "mode", "participant_id"],
  properties: {
    type: {
      type: "string",
      enum: ["join_queue", "queue_status"],
    },
    mode: {
      type: "string", 
      enum: ["2p", "4p"],
    },
    participant_id: { type: "string" },
  },
  additionalProperties: false,
} as const;

export const matchmakingResponseSchema = {
  type: "object",
  required: ["type"],
  properties: {
    type: {
      type: "string",
      enum: ["queue_joined", "game_ready", "queue_status", "error"],
    },
    mode: {
      type: "string",
      enum: ["2p", "4p"],
    },
    position: { type: "number" },
    players_needed: { type: "number" },
    game_id: { type: "number" },
    message: { type: "string" },
  },
  additionalProperties: false,
} as const;

export type MatchmakingRequest = FromSchema<typeof matchmakingRequestSchema>;
export type MatchmakingResponse = FromSchema<typeof matchmakingResponseSchema>;
export type MatchmakingMode = MatchmakingRequest["mode"];
//END_REMOTE_PLAYER_ADD
