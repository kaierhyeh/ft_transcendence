// src/routes/game.ts
import { FastifyInstance } from "fastify";

export default async function gameRoutes(fastify: FastifyInstance) {
  fastify.post("/create", async (req, reply) => {
    // use services / session manager here
    return { ok: true };
  });

  fastify.get("/:id/conf", async (req, reply) => {
    const { id } = req.params as { id: string };
    // return fastify.connectionManager.accept(Number(id));
    return { ok: true };
  });
}
