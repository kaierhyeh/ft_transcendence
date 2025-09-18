import { FastifyInstance } from "fastify";
import { createGameSchema, GameCreationBody, GameIdParams,gameIdSchema } from "../schemas";

export default async function gameRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: GameCreationBody }>(
    "/create",
    { schema: { body: createGameSchema } },
    async (request, reply) => {
      const { type, participants } = request.body;
      const game_id = fastify.live_sessions.createGameSession(type, participants);
      reply.status(201).send({game_id: game_id});
  });

  fastify.get<{ Params: GameIdParams }>(
    "/:id/conf", 
    { schema: { params: gameIdSchema } },
    async (request, reply) => {
      const { id } = request.params;
      const conf = fastify.live_sessions.getGameSessionConf(id);
      if (!conf) return reply.status(404).send({ error: "Game not found"});
      reply.send(conf);
  });

  // WebSocket endpoint for real-time game updates
  fastify.get<{ Params: GameIdParams }>(
    "/:id/ws",
    { schema: { params: gameIdSchema }, websocket: true },
    (connection, request) => {
      const { id } = request.params;
      fastify.live_sessions.connectToGameSession(id, connection);
    }
  );
}
