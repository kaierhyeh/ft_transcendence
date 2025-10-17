import { FromSchema } from "json-schema-to-ts";

const formatSchema = {
  type: "string",
  enum: ["1v1", "2v2"],
} as const;

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
    format: formatSchema,
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


export const joinMatchSchema = {
  type: "object",
  required: ["format", "participant"],
  properties: {
    format: formatSchema,
    participant: participantSchema,
  },
  additionalProperties: false,
} as const;

// export const matchmakingResponseSchema = {
//   type: "object",
//   required: ["type"],
//   properties: {
//     type: {
//       type: "string",
//       enum: ["queue_joined", "game_ready", "queue_status", "error"],
//     },
//     mode: {
//       type: "string",
//       enum: ["2p", "4p"],
//     },
//     position: { type: "number" },
//     players_needed: { type: "number" },
//     game_id: { type: "number" },
//     message: { type: "string" },
//   },
//   additionalProperties: false,
// } as const;


// 👇 Types derived from schemas
export type MatchParticipant = FromSchema<typeof participantSchema>;
export type MatchMakingData = FromSchema<typeof matchMakingSchema>;
export type GameFormat = FromSchema<typeof formatSchema>;
export type GameMode = MatchMakingData["mode"];
export type PlayerType = MatchParticipant["type"];
export type JoinMatchData = FromSchema<typeof joinMatchSchema>;