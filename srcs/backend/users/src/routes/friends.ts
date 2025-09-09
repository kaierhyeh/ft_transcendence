import { FastifyInstance } from "fastify";

export default async function friendsRoutes(fastify: FastifyInstance) {
  fastify.get("/sessions", async (req, reply) => {
    return { ok: true };
  });
}
