import { FromSchema } from "json-schema-to-ts";

export const gameSessionClaimsSchema = {
  type: "object",
  required: ["sub", "game_id", "player_id", "player_type"],
  properties: {
    sub: { type: "string"},
    game_id: { type: "number" },
    player_id: { type: "number" },
    player_type: {
      type: "string",
      enum: ["registered", "guest", "ai"]
    },
    tournament_id: { type: "number" }
  },
  additionalProperties: false
} as const;

export type GameSessionClaims = FromSchema<typeof gameSessionClaimsSchema>;
export type PlayerType = GameSessionClaims["player_type"];