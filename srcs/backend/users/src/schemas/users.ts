import { FromSchema } from "json-schema-to-ts";

// Elementary field schemas (reusable building blocks)

const usernameSchema = {
    type: "string",
    minLength: 1,
    maxLength: 50,
    description: "Username for login and display"
} as const;

const emailSchema = {
    type: "string",
    format: "email",
    maxLength: 254,
    description: "Optional email address"
} as const;

const passwordSchema = {
  type: "string",
  minLength: 8,
  maxLength: 128,
} as const;

const aliasSchema = {
  type: "string",
  minLength: 1,
  maxLength: 50
} as const;

const googleSubFieldSchema = {
  type: "string"
} as const;

const settingsSchema = {
  type: "string"
} as const;


// For local user creation
export const createLocalUserSchema = {
  type: "object",
  properties: {
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
  },
  required: ["username", "password"],
  additionalProperties: false,
} as const;

// For Google OAuth account creation
export const createGoogleUserSchema = {
  type: "object",
  required: ["google_sub", "username"],
  properties: {
    google_sub: googleSubFieldSchema,
    username: usernameSchema,
    email: emailSchema,
    alias: aliasSchema
  },
  additionalProperties: false,
} as const;

// For looking up users by Google sub
export const googleSubParamsSchema = {
  type: "object",
  required: ["google_sub"],
  properties: {
    google_sub: { type: "string" }
  },
  additionalProperties: false,
} as const;

export const updatePasswordSchema = {
  type: "object",
  required: ["old", "new"],
  properties: {
    old: passwordSchema,
    new: passwordSchema
  },
  additionalProperties: false
} as const;

export const updateSchema = {
  type: "object", 
  properties: {
    password: updatePasswordSchema,
    alias: aliasSchema,
    settings: settingsSchema,
  },
  additionalProperties: false
} as const;

export const userIdSchema = {
  type: "object",
    required: ["uid"],
    properties: {
      uid: { type: "number" },
    },
    additionalProperties: false,
} as const;

export const userLookupSchema = {
  type: "object",
    required: ["identifier"],
    properties: {
      identifier: { type: "string" },
    },
    additionalProperties: false,
} as const;

export const credentialsSchema = {
  type: "object",
  required: ["username", "password"],
  properties: {
    username: usernameSchema,
    password: passwordSchema,
  },
  additionalProperties: false,
} as const;

export const matchHistoryQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1},
    limit: { type: 'integer', minimum: 1, maximum: 20, default: 10 },
  }
} as const;

export const avatarQuerySchema = {
  type: 'object',
  properties: {
    v: {type: "string"},
  }
} as const;



export type LocalUserCreationRawData = FromSchema<typeof createLocalUserSchema>;
export type GoogleUserCreationData = FromSchema<typeof createGoogleUserSchema>;
export type GoogleSubParams = FromSchema<typeof googleSubParamsSchema>;
export type UpdateRawData = FromSchema<typeof updateSchema>;
export type PasswordUpdateData = FromSchema<typeof updatePasswordSchema>;
export type UserIdParams = FromSchema<typeof userIdSchema>;
export type UserLookupParams = FromSchema<typeof userLookupSchema>;
export type Credentials = FromSchema<typeof credentialsSchema>;
export type MatchHistoryQuery = FromSchema<typeof matchHistoryQuerySchema>;
export type AvatarQuery = FromSchema<typeof avatarQuerySchema>;