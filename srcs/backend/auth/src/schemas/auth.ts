import { FromSchema } from "json-schema-to-ts";

// Username validation rules
export const usernameSchema = {
  type: "string",
  minLength: 3,
  maxLength: 15,
  pattern: "^(?!.*(.)\\1{6,})[a-zA-Z][a-zA-Z0-9_]{2,14}$",
  description: "Username (3-15 chars, letters/numbers/underscores, no 7+ repeats)",
  errorMessage: {
    type: "Username must be a string",
    minLength: "Username must be at least 3 characters long",
    maxLength: "Username cannot exceed 15 characters",
    pattern: "Username must be 3-15 characters, letters/numbers/underscores, and cannot contain 7 or more repeated characters in a row.",
  },
} as const;

// Email validation rules
export const emailSchema = {
  type: "string",
  format: "email",
  maxLength: 254,
  description: "Valid email address",
  errorMessage: {
    type: "Email must be a string",
    format: "Email must be a valid email address",
    maxLength: "Email cannot exceed 254 characters",
  },
} as const;


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
  required: ["username", "password"],
  properties: {
    username: { ...usernameSchema },
    password: { ...passwordSchema },
  },
  additionalProperties: false,
  errorMessage: {
    required: {
      username: "Username is required",
      password: "Password is required",
    },
    additionalProperties: "Unknown field in request body",
  },
} as const;

// NOTE - Currently, signupFormSchema is identical to loginSchema.
// Defined separately to allow for future changes specific to signup requirements.
// NOTE: passwordSchema is assumed to be defined elsewhere in your file.
// const passwordSchema = { ... }; 

export const signupFormSchema = {
  type: "object",
  required: ["username", "password"],
  properties: {
    username: { ...usernameSchema },
    email: { ...emailSchema },
    password: { ...passwordSchema },
  },
  additionalProperties: false,
  errorMessage: {
    required: {
      username: "Username is required",
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