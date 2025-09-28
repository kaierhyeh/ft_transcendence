import { FromSchema } from "json-schema-to-ts";

export const gameSessionClaimsSchema = {
  type: "object",
  required: ["sub", "game_id"],
  properties: {
    sub: { type: "string"},
    game_id: { type: "number" },
  },
  additionalProperties: false
} as const;

export type GameSessionClaims = FromSchema<typeof gameSessionClaimsSchema>;