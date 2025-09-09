import { FromSchema } from "json-schema-to-ts";

// export const playerSchema = {
//   type: "object",
//   required: ["user_id", "participant_id"],
//   properties: {
//     user_id: { type: "number" },
//     participant_id: { type: "string" },
//   },
//   additionalProperties: false,
// } as const;

// export const gameIdSchema = {
//   type: "object",
//     required: ["id"],
//     properties: {
//       id: { type: "number" },
//     },
//     additionalProperties: false,
// } as const;

export const createAccountSchema = {
  type: "object",
  required: ["username", "email", "password_hash"],
  properties: {
    username: {
      type: "string",
    },
    email: {
      type: "string",
    },
    password_hash: {
      type: "string",
    },
    alias: {
      type: "string",
    },
    avatar_url: {
      type: "string"
    }
  },
  additionalProperties: false,
} as const;

// 👇 Types derived from schemas
export type AccountCreationData = FromSchema<typeof createAccountSchema>;