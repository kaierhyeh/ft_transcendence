import { FastifyInstance } from "fastify";

export default async function blocksRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/",
    async (request, reply) => {
      // body { target_id } -> block user
    });

  fastify.delete(
    "/:id",
    async (request, reply) => {
      // unblock user
    });

  fastify.get("/", async (request, reply) => {
    // get blocked list
    return { ok: true };
  });
}
