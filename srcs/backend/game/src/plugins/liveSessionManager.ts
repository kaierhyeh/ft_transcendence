import { FastifyPluginAsync } from "fastify";
import { LiveSessionManager } from "../game/LiveSessionManager";
import fp from "fastify-plugin";

declare module "fastify" {
  interface FastifyInstance {
    sessions: LiveSessionManager;
  }
}

const liveSessionManagerPlugin: FastifyPluginAsync = async (fastify) => {
  const manager = new LiveSessionManager(fastify.log);

  fastify.decorate("sessions", manager);
};

export default fp(liveSessionManagerPlugin, {
  name: "live-session-manager-plugin",
  fastify: "4.x"
});
