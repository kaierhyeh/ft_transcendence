import { FastifyInstance } from "fastify";
import { gameSessionQuerySchema, GameSessionQuery } from "../schemas";

export default async function sessionsRoutes(fastify: FastifyInstance) {
  // GET /sessions - Get past game sessions
  fastify.get<{ Querystring: GameSessionQuery }>(
    "/sessions",
    { schema: gameSessionQuerySchema },
    async (request, reply) => {
      const { page, limit, user_id } = request.query;
      
      reply.send({ page, limit, user_id });
  });
}
