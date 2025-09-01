// src/routes/game.ts
import { FastifyInstance } from "fastify";

export default async function sessionsRoutes(fastify: FastifyInstance) {
  fastify.get("/sessions", async (req, reply) => {
    return { ok: true };
  });
}
