import { FastifyInstance } from "fastify";

export default async function friendsRoutes(fastify: FastifyInstance) {

  // List current friends [Requires user authentication]
  fastify.get(
    "/",
    async (req, reply) => {
  });

  // List pending requests (in/out) [Requires user authentication]
  fastify.get(
    "/pending",
    async (req, reply) => {
  });

  // Send a friend request [Requires user authentication]
  fastify.post(
    "/request/:id",
    async (request, reply) => {
    });

  // Cancel a friend request [Requires user authentication]
  fastify.delete(
    "/request/:id",
    async (request, reply) => {
  });

  // Accept friend request [Requires user authentication]
  fastify.post(
    "/accept/:id",
    async (request, reply) => {
  });

  // Decline friend request [Requires user authentication]
  fastify.post(
    "/decline/:id",
    async (request, reply) => {
  });

  // Remove friend [Requires user authentication]
  fastify.delete(
    "/:id",
    async (request, reply) => {
  });

}
