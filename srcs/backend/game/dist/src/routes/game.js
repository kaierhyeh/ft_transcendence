"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = gameRoutes;
const schemas_1 = require("../schemas");
async function gameRoutes(fastify) {
    fastify.post("/create", { schema: { body: schemas_1.createGameSchema } }, async (request, reply) => {
        const { type, participants } = request.body;
        const game_id = fastify.sessions.createGameSession(type, participants);
        reply.status(201).send({ game_id: game_id });
    });
    fastify.get("/:id/conf", { schema: { params: schemas_1.gameIdSchema } }, async (request, reply) => {
        const { id } = request.params;
        const conf = fastify.sessions.getGameSessionConf(id);
        if (!conf)
            return reply.status(404).send({ error: "Game not found" });
        reply.send(conf);
    });
    // WebSocket endpoint for real-time game updates
    fastify.get("/:id/ws", { schema: { params: schemas_1.gameIdSchema }, websocket: true }, (connection, request) => {
        const { id } = request.params;
        fastify.sessions.connectToGameSession(id, connection);
    });
}
//# sourceMappingURL=game.js.map