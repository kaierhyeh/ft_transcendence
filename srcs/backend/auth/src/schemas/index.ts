import { FromSchema } from "json-schema-to-ts";

// For local account creation
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

export type SignupFormData = FromSchema<typeof signupFormSchema>;