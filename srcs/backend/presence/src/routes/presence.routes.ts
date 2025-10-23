import { FastifyInstance } from "fastify";
import { PresenceController } from '../controllers/PresenceController';

export default async function presenceRoutes(fastify: FastifyInstance) {
  const presenceController = new PresenceController();

  // GET /ws - Accept WebSocket connection for presence updates
  fastify.get("/ws", { websocket: true }, presenceController.accept.bind(presenceController));
  
}
