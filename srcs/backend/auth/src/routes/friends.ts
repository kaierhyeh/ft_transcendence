import { FastifyInstance } from "fastify";

export default async function friendsRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/",
    async (request, reply) => {
      // body { target_id } expected
      // -> send friend request
    });

  fastify.post(
    "/:id/accept",
    async (request, reply) => {
      // accept a friend request
    });

  fastify.delete(
    "/:id",
    async (request, reply) => {
      // remove friend
    });

  fastify.get(
    "/",
    async (req, reply) => {
    // return list of friends (paginated)
    return { ok: true };
  });

}
