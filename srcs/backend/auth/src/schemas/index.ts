import { FromSchema } from "json-schema-to-ts";

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

export type SignupFormData = FromSchema<typeof signupFormSchema>;
export type LoginData = FromSchema<typeof loginSchema>;