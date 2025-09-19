import { FastifyInstance } from "fastify";

export default async function blocksRoutes(fastify: FastifyInstance) {

  // List blocked users [Requires user authentication] 
  fastify.get("/", async (request, reply) => {
    // get blocked list
    return { ok: true };
  });
  
  // Block user [Requires user authentication] 
  fastify.post(
    "/:id",
    async (request, reply) => {
    });

  // Unblok user [Requires user authentication]
  fastify.delete(
    "/:id",
    async (request, reply) => {
  });

  // Check if blocked [Requires internal service authentication]
  fastify.post(
    "/check",
    async (request, reply) => {
      // expected body: {user_id: number, target_id: number}
  });

}
