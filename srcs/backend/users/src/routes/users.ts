import { FastifyInstance } from "fastify";
import { createGameSchema, GameCreationBody, GameIdParams,gameIdSchema } from "../schemas";

export default async function usersRoutes(fastify: FastifyInstance) {
  fastify.get<{ Body: GameCreationBody }>(
    "/:id",
    { schema: { body: createGameSchema } },
    async (request, reply) => {
      const { type, participants } = request.body;
      // const game_id = fastify.sessions.createGameSession(type, participants);
      // reply.status(201).send({game_id: game_id});
  });

  fastify.get<{ Params: GameIdParams }>(
    "/me", 
    { schema: { params: gameIdSchema } },
    async (request, reply) => {
      const { id } = request.params;
      // const conf = fastify.sessions.getGameSessionConf(id);
      // if (!conf) return reply.status(404).send({ error: "Game not found"});
      // reply.send(conf);
  });

  fastify.put<{ Params: GameIdParams }>(
    "/me",
    { schema: { params: gameIdSchema } },
    (request, reply) => {
      const { id } = request.params;
      // fastify.sessions.connectToGameSession(id, connection);
    }
  );

  fastify.post(
    "/me/avatar",
    async (request, reply) => {

    });

  fastify.get(
    "/",
    async (request, reply) => {
      // search user
    });
}
