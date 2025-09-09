import { FastifyInstance } from "fastify";

export default async function blocksRoutes(fastify: FastifyInstance) {
  fastify.get("/", async (req, reply) => {
    return { ok: true };
  });
}
