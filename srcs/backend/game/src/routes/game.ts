import { FastifyInstance } from "fastify";
import { createGameSchema, GameCreationBody, GameIdParams,gameIdSchema } from "../schemas";
import { internalAuthMiddleware } from "../middleware/internalAuth";

export default async function gameRoutes(fastify: FastifyInstance) {
  // POST /create - Create a new game session [protected]
  fastify.post<{ Body: GameCreationBody }>(
    "/create",
    { 
      schema: { body: createGameSchema },
      preHandler: internalAuthMiddleware  // ← Simple protection!
    },
    async (request, reply) => {
      const { mode, participants } = request.body;
      const game_id = fastify.live_sessions.createGameSession(mode, participants);
      reply.status(201).send({game_id: game_id});
  });

  // GET /:id/conf - Get game session configuration
  fastify.get<{ Params: GameIdParams }>(
    "/:id/conf", 
    { schema: { params: gameIdSchema } },
    async (request, reply) => {
      const { id } = request.params;
      const conf = fastify.live_sessions.getGameSessionConf(id);
      if (!conf) return reply.status(404).send({ error: "Game not found"});
      reply.send(conf);
  });

  // GET /:id/ws - WebSocket endpoint for real-time game updates
  fastify.get<{ Params: GameIdParams }>(
    "/:id/ws",
    { schema: { params: gameIdSchema }, websocket: true },
    (connection, request) => {
      const { id } = request.params;
      fastify.live_sessions.connectToGameSession(id, connection);
    }
  );
}
