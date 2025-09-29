import { FromSchema } from "json-schema-to-ts";

export const loginSchema = {
  type: "object",
  required: ["login", "password"],
  properties: {
    login: {
      type: "string",
      minLength: 3,      // Shortest username
      maxLength: 254,    // Longest email
      description: "Username or email address"
    },
    password: {
      type: "string",
      minLength: 8
    }
  },
  additionalProperties: false,
} as const;

export const gameSessionClaimsSchema = {
  type: "object",
  required: ["sub", "game_id"],
  properties: {
    sub: { type: "string"},
    game_id: { type: "number" },
  },
  additionalProperties: false
} as const;

export type LoginRequest = FromSchema<typeof loginSchema>;
export type GameSessionClaims = FromSchema<typeof gameSessionClaimsSchema>;