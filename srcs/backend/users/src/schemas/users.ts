import { FromSchema } from "json-schema-to-ts";
import { CONFIG } from "../config";

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

const googleSubSchema = {
  type: "string"
} as const;

const settingsSchema = {
  type: "string"
} as const;

const twoFAEnabledSchema = {
  type: "boolean"
} as const;


// For local user creation
export const createLocalUserSchema = {
  type: "object",
  required: ["username", "email", "password_hash"],
  properties: {
    username: usernameSchema,
    email: emailSchema,
    password_hash: passwordHashSchema,
    alias: aliasSchema
  },
  additionalProperties: false,
} as const;

// For Google OAuth account creation
export const createGoogleUserSchema = {
  type: "object",
  required: ["google_sub", "email", "username"],
  properties: {
    google_sub: googleSubSchema,
    email: emailSchema,
    username: usernameSchema,
    alias: aliasSchema
  },
  additionalProperties: false,
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
    settings: settingsSchema,
    two_fa_enabled: twoFAEnabledSchema
  },
  additionalProperties: false
} as const;

export const userIdSchema = {
  type: "object",
    required: ["id"],
    properties: {
      id: { type: "number" },
    },
    additionalProperties: false,
} as const;

export const avatarDataSchema = {
  consumes: ['multipart/form-data'],
  body: {
    type: 'object',
    properties: {
      avatar: { 
        type: 'object',
        properties: {
          filename: { type: 'string' },
          mimetype: { type: 'string', pattern: '^image/(jpeg|png|gif|webp)$' },
          size: { type: 'number', maximum: CONFIG.AVATAR.MAX_SIZE } 
        }
      }
    }
  }
} as const;

export const avatarFilenameSchema = {
  type: 'object',
  required: ['filename'],
  properties: {
    filename: {
      type: 'string',
      pattern: `^(user_\\d+_\\d+\\.(jpg|jpeg|png|gif|webp)|${CONFIG.AVATAR.DEFAULT_FILENAME.replace('.', '\\.')})$`,
      description: `Filename of avatar image: user_<userId>_<timestamp>.<extension> or ${CONFIG.AVATAR.DEFAULT_FILENAME}`
    },
  },
  additionalProperties: false,
} as const;

export type LocalUserCreationData = FromSchema<typeof createLocalUserSchema>;
export type GoogleUserCreationData = FromSchema<typeof createGoogleUserSchema>;
export type LoginParams = FromSchema<typeof loginSchema>;
export type UpdateRawData = FromSchema<typeof updateSchema>;
export type PasswordUpdateData = FromSchema<typeof updatePasswordSchema>;
export type UserIdParams = FromSchema<typeof userIdSchema>;
export type AvatarParams = FromSchema<typeof avatarFilenameSchema>;