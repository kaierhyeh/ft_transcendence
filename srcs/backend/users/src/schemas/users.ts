import { FromSchema } from "json-schema-to-ts";

// For local account creation
export const createLocalAccountSchema = {
  type: "object",
  required: ["username", "email", "password_hash"],
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
    password_hash: {
      type: "string",
      minLength: 8 // You'll hash this before storing
    },
    alias: {
      type: "string",
      minLength: 1,
      maxLength: 50
    },
    avatar_url: {
      type: "string",
      format: "uri"
    }
  },
  additionalProperties: false,
} as const;

// For Google OAuth account creation
export const createGoogleAccountSchema = {
  type: "object",
  required: ["google_sub", "email", "username"],
  properties: {
    google_sub: {
      type: "string" // Google's unique identifier for the user
    },
    email: {
      type: "string",
      format: "email"
    },
    username: {
      type: "string",
      minLength: 3,
      maxLength: 30,
      pattern: "^[a-zA-Z0-9_-]+$"
    },
    alias: {
      type: "string",
      minLength: 1,
      maxLength: 50
    },
    avatar_url: {
      type: "string",
      format: "uri"
    }
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

export const emailSchema = {
  type: "object",
  required: ["email"],
  properties: {
    email: { 
      type: "string",
      format: "email",
      minLength: 5,
      maxLength: 254,
      pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
      description: "Valid email address"
    },
  },
  additionalProperties: false,
  // errorMessage: {
  //   properties: {
  //     email: "Must be a valid email address (e.g., user@example.com)"
  //   }
  // }
} as const;

export const usernameSchema = {
  type: "object",
  required: ["username"],
  properties: { 
    username: {
      type: "string",
      minLength: 3,
      maxLength: 30,
      pattern: "^[a-zA-Z0-9_-]+$"
    },
  },
  additionalProperties: false
} as const;

export const subSchema = {
  type: "object",
  required: ["sub"],
  properties: { 
    sub: {type: "string" },
  },
  additionalProperties: false
} as const;


export type AccountCreationData = FromSchema<typeof createAccountSchema>;
export type LocalUserCreationData = FromSchema<typeof createLocalAccountSchema>;
export type GoogleUserCreationData = FromSchema<typeof createGoogleAccountSchema>;
export type EmailParams = FromSchema<typeof emailSchema>;
export type SubParams = FromSchema<typeof subSchema>;
export type UsernameParams = FromSchema<typeof usernameSchema>;