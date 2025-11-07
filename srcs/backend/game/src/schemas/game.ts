import { FromSchema } from "json-schema-to-ts";

export const playerSchema = {
  type: "object",
  required: ["participant_id", "type"],
  properties: {
    participant_id: { type: "string" },
    type: {
      type: "string",
      enum: ["registered", "guest", "ai"],
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

export const invitationSchema = {
  type: "object",
  required: [ "fromId", "toId" ],
  properties: {
    fromId: { type: "number", minimum: 1 },
    toId: { type: "number", minimum: 1 },
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
    invitation: invitationSchema
  },
  additionalProperties: false,
} as const;


// 👇 Types derived from schemas
export type GameParticipant = FromSchema<typeof playerSchema>;
export type GameIdParams = FromSchema<typeof gameIdSchema>;
export type GameCreationData = FromSchema<typeof createGameSchema>;
export type GameMode = GameCreationData["mode"];
export type GameFormat = GameCreationData["format"];
export type GameInvitation = FromSchema<typeof invitationSchema>;

//REMOTE_PLAYER_ADD
export const matchmakingRequestSchema = {
 type: "object",
  required: ["format", "participant"],
  properties: {
    format : {
        type: "string",
        enum: ["1v1", "2v2"]
    },
    participant:  playerSchema,
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
    format: {
      type: "string",
      enum: ["1v1", "2v2"],
    },
    position: { type: "number" },
    players_needed: { type: "number" },
    game_id: { type: "number" },
    message: { type: "string" },
    team: { type: "string", enum: ["left", "right"]},
    slot: { type: "string", enum: ["left", "right", "bottom-left", "bottom-right", "top-left", "top-right"]},
  },
  additionalProperties: false,
} as const;

export type MatchmakingRequest = FromSchema<typeof matchmakingRequestSchema>;
export type MatchmakingResponse = FromSchema<typeof matchmakingResponseSchema>;
export type MatchmakingFormat = MatchmakingRequest["format"];
//END_REMOTE_PLAYER_ADD
