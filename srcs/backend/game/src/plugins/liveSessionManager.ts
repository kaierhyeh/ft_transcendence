import { FastifyInstance } from "fastify";
import { LiveSessionManager } from "../game/LiveSessionManager";

export default async function liveSessionManagerPlugin(fastify: FastifyInstance) {
  const manager = new LiveSessionManager();
  fastify.decorate("sessions", manager);
}
