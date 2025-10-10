import { FastifyInstance } from "fastify";
import { gameSessionQuerySchema, GameSessionQuery } from "../schemas";

export default async function sessionsRoutes(fastify: FastifyInstance) {
  // GET /sessions - Get past game sessions
  fastify.get<{ Querystring: GameSessionQuery }>(
    "/sessions",
    { schema: gameSessionQuerySchema },
    async (request, reply) => {
      const { page, limit, user_id } = request.query;
      const payload = fastify.session_repo.get(page, limit, user_id);
      
      reply.send(payload);
  });
}
