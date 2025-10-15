import { LiveSessionManager } from "../game/LiveSessionManager";
declare module "fastify" {
    interface FastifyInstance {
        sessions: LiveSessionManager;
    }
}
declare const _default: any;
export default _default;
//# sourceMappingURL=liveSessionManager.d.ts.map