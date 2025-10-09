import { FastifyInstance } from "fastify";

export default async function sessionsRoutes(fastify: FastifyInstance) {
  // GET /sessions - Get past game sessions
  fastify.get("/sessions", async (req, reply) => {
  });
}
