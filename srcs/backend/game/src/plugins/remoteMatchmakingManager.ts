import { FastifyPluginAsync } from "fastify";
import { MatchmakingManager } from "../game/remoteMatchmaking";
import fp from "fastify-plugin";

declare module "fastify" {
  interface FastifyInstance {
    matchmaking: MatchmakingManager;
  }
}

const matchmakingManagerPlugin: FastifyPluginAsync = async (fastify) => {
  const manager = new MatchmakingManager(fastify.live_sessions);
  fastify.decorate("matchmaking", manager);
};

export default fp(matchmakingManagerPlugin, {
  name: "matchmaking-manager-plugin",
  fastify: "5.x"
});