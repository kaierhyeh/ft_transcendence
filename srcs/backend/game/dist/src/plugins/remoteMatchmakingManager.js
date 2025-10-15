"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const remoteMatchmaking_1 = require("../game/remoteMatchmaking");
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const matchmakingManagerPlugin = async (fastify) => {
    const manager = new remoteMatchmaking_1.MatchmakingManager(fastify.sessions);
    fastify.decorate("matchmaking", manager);
};
exports.default = (0, fastify_plugin_1.default)(matchmakingManagerPlugin, {
    name: "matchmaking-manager-plugin",
    fastify: "4.x"
});
//# sourceMappingURL=remoteMatchmakingManager.js.map