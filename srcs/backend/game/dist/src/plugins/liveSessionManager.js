"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const LiveSessionManager_1 = require("../game/LiveSessionManager");
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const liveSessionManagerPlugin = async (fastify) => {
    const manager = new LiveSessionManager_1.LiveSessionManager(fastify.repositories.sessions, fastify.log);
    fastify.decorate("sessions", manager);
};
exports.default = (0, fastify_plugin_1.default)(liveSessionManagerPlugin, {
    name: "live-session-manager-plugin",
    fastify: "4.x"
});
//# sourceMappingURL=liveSessionManager.js.map