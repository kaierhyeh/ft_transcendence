import { FastifyPluginAsync } from "fastify";
import { LiveSessionManager } from "../game/LiveSessionManager";
import { StatsClient } from "../clients/StatsClient";
import fp from "fastify-plugin";

declare module "fastify" {
  interface FastifyInstance {
    live_sessions: LiveSessionManager;
  }
}

const liveSessionManagerPlugin: FastifyPluginAsync = async (fastify) => {
  const statsClient = new StatsClient();
  const manager = new LiveSessionManager(
    fastify.session_repo,
    statsClient,
    fastify.log,
  );

  fastify.decorate("live_sessions", manager);
};

export default fp(liveSessionManagerPlugin, {
  name: "live-session-manager-plugin",
  fastify: "5.x"
});
