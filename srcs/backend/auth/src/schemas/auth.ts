import { FromSchema } from "json-schema-to-ts";

export const passwordSchema = {
  type: "string",
  minLength: 8,
  maxLength: 128,    // Reasonable password limit
} as const;

export const loginSchema = {
  type: "object",
  required: ["login", "password"],
  properties: {
    login: {
      type: "string",
      minLength: 3,      // Shortest username
      maxLength: 254,    // Longest email (RFC 5321)
      pattern: "^(?:[a-zA-Z][a-zA-Z0-9_]{2,14}|[^\\s@]+@[^\\s@]+\\.[^\\s@]+)$",
      description: "Username (3-15 chars, letters/numbers/underscores) or valid email address"
    },
    password: {
      ...passwordSchema,
        description: "Password must be at least 8 characters"
    }
  },
  additionalProperties: false,
} as const;

// NOTE - Currently, signupFormSchema is identical to loginSchema.
// Defined separately to allow for future changes specific to signup requirements.
export const signupFormSchema = {
  type: "object",
  required: ["login", "password"],
  properties: {
    login: {
      type: "string",
      minLength: 3,      // Shortest username
      maxLength: 254,    // Longest email (RFC 5321)
      pattern: "^(?:[a-zA-Z][a-zA-Z0-9_]{2,14}|[^\\s@]+@[^\\s@]+\\.[^\\s@]+)$",
      description: "Username (3-15 chars, letters/numbers/underscores) or valid email address"
    },
    password: {
      ...passwordSchema,
        description: "Password must be at least 8 characters"
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


export type LoginCredentials = FromSchema<typeof loginSchema>;
export type SignupRequest = FromSchema<typeof signupFormSchema>;
export type GameSessionClaims = FromSchema<typeof gameSessionClaimsSchema>;