"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const websocket_1 = __importDefault(require("@fastify/websocket"));
const liveSessionManager_1 = __importDefault(require("./plugins/liveSessionManager"));
const remoteMatchmakingManager_1 = __importDefault(require("./plugins/remoteMatchmakingManager"));
const db_1 = __importDefault(require("./plugins/db"));
const routes_1 = __importDefault(require("./routes"));
const config_1 = require("./config");
const fastify = (0, fastify_1.default)({ logger: true });
async function run() {
    await fastify.register(websocket_1.default);
    await fastify.register(db_1.default);
    await fastify.register(liveSessionManager_1.default);
    await fastify.register(remoteMatchmakingManager_1.default);
    for (const route of routes_1.default) {
        await fastify.register(route, { prefix: "/game" });
    }
    // Health check endpoint
    fastify.get('/health', async () => {
        return { status: 'ok', service: 'game', timestamp: new Date().toISOString() };
    });
    // Use config for update period
    setInterval(() => {
        fastify.sessions.update();
    }, config_1.CONFIG.GAME.TICK_PERIOD);
    await fastify.listen({
        port: config_1.CONFIG.SERVER.PORT,
        host: config_1.CONFIG.SERVER.HOST
    });
}
run().catch(console.error);
//# sourceMappingURL=index.js.map