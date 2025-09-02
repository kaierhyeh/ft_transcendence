import { FastifyInstance, FastifyRequest } from "fastify";
import { createGameSchema, GameCreationBody, GameIdParams,gameIdSchema,JoinGameBody, joinGameSchema} from "../schemas";

export default async function gameRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: GameCreationBody }>(
    "/create",
    { schema: { body: createGameSchema } },
    async (request, reply) => {
      const { type, participants } = request.body;
      const game_id = fastify.sessions.createGameSession(type, participants);
      reply.status(201).send({game_id: game_id});
  });

  fastify.get<{ Params: GameIdParams }>(
    "/:id/conf", 
    { schema: { params: gameIdSchema } },
    async (request, reply) => {
      const { id } = request.params;
      const conf = fastify.sessions.getGameSessionConf(id);
      if (!conf) return reply.status(404).send({ error: "Game not found"});
      reply.send(conf);
  });

  fastify.post<{ Params: GameIdParams; Body: JoinGameBody}>(
    "/:id/join",
    { schema: joinGameSchema},
    async (request, reply) => {
      const { id } = request.params;
      const { participant } = request.body;
      
      const result =  fastify.sessions.joinGameSession(id, participant);
      if (result.success)
        reply.status(result.status).send({ success: true, message: result.msg });
      else
        reply.status(result.status).send({ success: false, error: result.msg });
  });

  // WebSocket endpoint for real-time game updates
  fastify.get<{ Params: GameIdParams }>(
    "/:id/ws",
    { schema: { params: gameIdSchema }, websocket: true },
    (connection, request) => {
      const { id } = request.params;
      fastify.sessions.connectToGameSession(id, connection);
    }
  );
}
