import { FastifyPluginAsync } from "fastify";
import { LiveSessionManager } from "../game/LiveSessionManager";
import fp from "fastify-plugin";

declare module "fastify" {
  interface FastifyInstance {
    live_sessions: LiveSessionManager;
  }
}

const liveSessionManagerPlugin: FastifyPluginAsync = async (fastify) => {
  const manager = new LiveSessionManager(
    fastify.session_repo,
    fastify.log,
  );

  fastify.decorate("live_sessions", manager);
};

export default fp(liveSessionManagerPlugin, {
  name: "live-session-manager-plugin",
  fastify: "4.x"
});
