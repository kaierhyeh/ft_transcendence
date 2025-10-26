import { FastifyInstance } from "fastify";
import { presenceController } from '../controllers/PresenceController';

export default async function presenceRoutes(fastify: FastifyInstance) {

  // GET /ws - Accept WebSocket connection for presence updates
  fastify.get("/ws", { websocket: true }, (connection, request) => {
    console.log('🎯 WebSocket route /ws hit');
    presenceController.accept(connection);
  });
  
}
