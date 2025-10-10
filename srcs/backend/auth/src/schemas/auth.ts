import { FromSchema } from "json-schema-to-ts";

// Password validation rules
export const passwordSchema = {
  type: "string",
  minLength: 8,
  maxLength: 128,    // Reasonable password limit
  errorMessage: {
    type: "Password must be a string",
    minLength: "Password must be at least 8 characters long",
    maxLength: "Password cannot exceed 128 characters",
  },
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
      description: "Username (3-15 chars, letters/numbers/underscores) or valid email address",
      errorMessage: {
        type: "Login must be a string",
        minLength: "Login must be at least 3 characters long",
        maxLength: "Login cannot exceed 254 characters",
        pattern: "Login must be a valid username or email address",
      },
    },
    password: {
      ...passwordSchema,
      description: "Password must be at least 8 characters",
    },
  },
  additionalProperties: false,
  errorMessage: {
    required: {
      login: "Login is required",
      password: "Password is required",
    },
    additionalProperties: "Unknown field in request body",
  },
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
      description: "Username (3-15 chars, letters/numbers/underscores) or valid email address",
      errorMessage: {
        type: "Login must be a string",
        minLength: "Login must be at least 3 characters long",
        maxLength: "Login cannot exceed 254 characters",
        pattern: "Login must be a valid username or email address",
      },
    },
    password: {
      ...passwordSchema,
      description: "Password must be at least 8 characters",
    },
  },
  additionalProperties: false,
  errorMessage: {
    required: {
      login: "Login is required",
      password: "Password is required",
    },
    additionalProperties: "Unknown field in request body",
  },
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