import { FastifyInstance } from "fastify";
import { LiveSessionManager } from "../game/LiveSessionManager";
import fp from "fastify-plugin";

declare module "fastify" {
  interface FastifyInstance {
    sessions: LiveSessionManager;
  }
}

async function liveSessionManagerPlugin(fastify: FastifyInstance) {
  const manager = new LiveSessionManager(fastify.log);
  fastify.decorate("sessions", manager);
}

export default fp(liveSessionManagerPlugin);
