"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = sessionsRoutes;
async function sessionsRoutes(fastify) {
    fastify.get("/sessions", async (req, reply) => {
        return { ok: true };
    });
}
//# sourceMappingURL=sessions.js.map