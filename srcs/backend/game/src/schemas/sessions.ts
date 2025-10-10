import { FromSchema } from "json-schema-to-ts";

export const gameSessionQuerySchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1},
      limit: { type: 'integer', minimum: 1, maximum: 20, default: 10 },
      user_id: {type: ['integer', 'null'], nullable: true, default: null}
    }
  }
} as const;

export type GameSessionQuery = FromSchema<typeof gameSessionQuerySchema.querystring>;