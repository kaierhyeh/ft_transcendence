import { MatchmakingManager } from "../game/remoteMatchmaking";
declare module "fastify" {
    interface FastifyInstance {
        matchmaking: MatchmakingManager;
    }
}
declare const _default: any;
export default _default;
//# sourceMappingURL=remoteMatchmakingManager.d.ts.map