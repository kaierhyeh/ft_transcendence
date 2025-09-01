import "fastify";
import { LiveSessionManager } from "../game/LiveSessionManager";

declare module "fastify" {
  interface FastifyInstance {
    sessions: LiveSessionManager;
  }
}
