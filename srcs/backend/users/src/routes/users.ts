import { FastifyInstance } from "fastify";
import { createGameSchema, GameCreationBody, GameIdParams,gameIdSchema } from "../schemas";

export default async function usersRoutes(fastify: FastifyInstance) {
  fastify.get<{ Body: GameCreationBody }>(
    "/:id",
    { schema: { body: createGameSchema } },
    async (request, reply) => {
      // return public profile (display_name, avatar_url stats_summary)

      // const { type, participants } = request.body;
      // const game_id = fastify.sessions.createGameSession(type, participants);
      // reply.status(201).send({game_id: game_id});
  });

  fastify.put<{ Params: GameIdParams }>(
    "/me",
    { schema: { params: gameIdSchema } },
    (request, reply) => {
      // (authenticated) -> update profile (display_name, avatar, settings)

      // const { id } = request.params;
      // fastify.sessions.connectToGameSession(id, connection);
    }
  );

  fastify.post(
    "/me/avatar",
    async (request, reply) => {
      // uplaod avatar (multipart) -> returns `avatar_url`?

    });

  fastify.get<{ Params: GameIdParams }>(
    "/me", 
    { schema: { params: gameIdSchema } },
    async (request, reply) => {
      // retrieve current user profile

      // const { id } = request.params;
      // const conf = fastify.sessions.getGameSessionConf(id);
      // if (!conf) return reply.status(404).send({ error: "Game not found"});
      // reply.send(conf);
  });

  fastify.get(
    "/",
    async (request, reply) => {
      // search user
    });
}
