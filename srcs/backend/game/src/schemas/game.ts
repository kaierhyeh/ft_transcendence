import { FromSchema } from "json-schema-to-ts";

export const playerSchema = {
  type: "object",
  required: ["player_id", "type", "team", "slot"],
  properties: {
    player_id: { type: "number" },
    type: {
      type: "string",
      enum: ["registered", "guest", "ai"],
    },
    team: {
      type: "string",
      enum: ["left", "right"],
    },
    slot: {
      type: "string",
      enum: ["left", "right", "top-left", "bottom-left", "top-right", "bottom-right"],
    },
    user_id: { type: "number" },
    username: { type: "string" },
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
  required: ["format", "mode", "participants"],
  properties: {
    format : {
        type: "string",
        enum: ["1v1", "2v2"]
    },
    mode: {
      type: "string",
      enum: ["solo", "pvp", "tournament"],
    },
    online: {
      type: "boolean",
      default: false,
    },
    tournament_id: { type: "number"},
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
export type GameCreationData = FromSchema<typeof createGameSchema>;
export type GameMode = GameCreationData["mode"];
export type GameFormat = GameCreationData["format"];
//REMOTE_PLAYER_ADD
export const matchmakingRequestSchema = {
  type: "object",
  required: ["mode", "participant_id"],
  properties: {
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
