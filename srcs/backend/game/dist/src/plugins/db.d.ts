import Database from "better-sqlite3";
import { SessionRepository } from "../db/repositories/SessionRepository";
declare module "fastify" {
    interface FastifyInstance {
        db: Database.Database;
        repositories: {
            sessions: SessionRepository;
        };
    }
}
declare const _default: any;
export default _default;
//# sourceMappingURL=db.d.ts.map