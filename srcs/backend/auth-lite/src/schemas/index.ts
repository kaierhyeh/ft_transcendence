import { FromSchema } from "json-schema-to-ts";

const aliasSchema = {
  type: "string",
  minLength: 1,
  maxLength: 50
} as const;


export const signupFormSchema = {
  type: "object",
  required: ["username", "email", "password"],
  properties: {
    username: {
      type: "string",
      minLength: 3,
      maxLength: 30,
      pattern: "^[a-zA-Z0-9_-]+$" // Only alphanumeric, underscore, hyphen
    },
    email: {
      type: "string",
      format: "email"
    },
    password: {
      type: "string",
      minLength: 8 // You'll hash this before storing
    },
    alias: aliasSchema
  },
  additionalProperties: false,
} as const;

export const createGuestSchema = {
  type: "object",
  properties: {
    alias: aliasSchema,
  },
  additionalProperties: false,
} as const;

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

export const passwordSchema = {
  type: "string",
  minLength: 8,
  description: "Password to be hashed"
} as const;

export const passwordUpdateSchema = {
  type: "object",
  required: ["old_hash", "old_password", "new_password"],
  properties: {
    old_hash: {
      type: "string",
      description: "Current password hash from database"
    },
    old_password: {
      type: "string",
      minLength: 8,
      description: "Current password provided by user"
    },
    new_password: {
      type: "string", 
      minLength: 8,
      description: "New password to be hashed"
    }
  },
  additionalProperties: false
} as const;

export const gameSessionClaimsSchema = {
  type: "object",
  required: ["sub", "game_id", "player_id", "type"],
  properties: {
    sub: { type: "string"},
    game_id: { type: "number" },
    player_id: { type: "number" },
    type: {
      type: "string",
      enum: ["registered", "guest", "ai"]
    },
    tournament_id: { type: "number" }
  },
  additionalProperties: false
} as const;

export type SignupFormData = FromSchema<typeof signupFormSchema>;
export type LoginData = FromSchema<typeof loginSchema>;
export type PasswordUpdateData = FromSchema<typeof passwordUpdateSchema>;
export type GuestRawData = FromSchema<typeof createGuestSchema>;
export type GameSessionClaims = FromSchema<typeof gameSessionClaimsSchema>;