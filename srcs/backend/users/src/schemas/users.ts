import { FromSchema } from "json-schema-to-ts";

// Elementary field schemas (reusable building blocks)
const usernameSchema = {
  type: "string",
  minLength: 3,
  maxLength: 30,
  pattern: "^[a-zA-Z0-9_-]+$"
} as const;

const emailSchema = {
  type: "string",
  format: "email",
  minLength: 5,
  maxLength: 254
} as const;

const passwordSchema = {
  type: "string",
  minLength: 8
} as const;

const passwordHashSchema = {
  type: "string",
  minLength: 8
} as const;

const aliasSchema = {
  type: "string",
  minLength: 1,
  maxLength: 50
} as const;

const avatarUrlSchema = {
  type: "string",
  format: "uri"
} as const;

const googleSubSchema = {
  type: "string"
} as const;

const settingsSchema = {
  type: "string"
} as const;

const twoFAEnabledSchema = {
  type: "boolean"
} as const;


// For local account creation
export const createLocalAccountSchema = {
  type: "object",
  required: ["username", "email", "password_hash"],
  properties: {
    username: usernameSchema,
    email: emailSchema,
    password_hash: passwordHashSchema,
    alias: aliasSchema,
    avatar_url: avatarUrlSchema
  },
  additionalProperties: false,
} as const;

// For Google OAuth account creation
export const createGoogleAccountSchema = {
  type: "object",
  required: ["google_sub", "email", "username"],
  properties: {
    google_sub: googleSubSchema,
    email: emailSchema,
    username: usernameSchema,
    alias: aliasSchema,
    avatar_url: avatarUrlSchema
  },
  additionalProperties: false,
} as const;

// Union type for the API
export const createAccountSchema = {
  type: "object",
  required: ["type"],
  properties: {
    type: {
      type: "string",
      enum: ["local", "google"]
    }
  },
  oneOf: [
    {
      properties: {
        type: { const: "local" },
        ...createLocalAccountSchema.properties
      },
      required: ["type", ...createLocalAccountSchema.required],
      additionalProperties: false
    },
    {
      properties: {
        type: { const: "google" },
        ...createGoogleAccountSchema.properties
      },
      required: ["type", ...createGoogleAccountSchema.required],
      additionalProperties: false
    }
  ]
} as const;

export const loginSchema = {
  type: "object",
  required: ["login"],
  properties: {
    login: { 
      type: "string",
      minLength: 1,      // Allow any identifier length
      maxLength: 254,    // Max email length
      description: "Username, email address, or Google sub"
    },
  },
  additionalProperties: false
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
    email: emailSchema,
    password: updatePasswordSchema,
    alias: aliasSchema,
    avatar_url: avatarUrlSchema,
    settings: settingsSchema,
    two_fa_enabled: twoFAEnabledSchema
  },
  additionalProperties: false
} as const;


export type AccountCreationData = FromSchema<typeof createAccountSchema>;
export type LocalUserCreationData = FromSchema<typeof createLocalAccountSchema>;
export type GoogleUserCreationData = FromSchema<typeof createGoogleAccountSchema>;
export type LoginParams = FromSchema<typeof loginSchema>;
export type UpdateRawData = FromSchema<typeof updateSchema>;
export type PasswordUpdateData = FromSchema<typeof updatePasswordSchema>;