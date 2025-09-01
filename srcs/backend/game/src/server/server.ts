// src/server/server.ts
import Fastify from "fastify";
import routes from "../routes"; // array of route plugins
import websocketPlugin from '@fastify/websocket';
import liveSessionManagerPlugin from "../plugins/liveSessionManager";

export function createServer() {
  const fastify = Fastify();

  fastify.register(websocketPlugin);
  fastify.register(liveSessionManagerPlugin)

  // register all route files
  for (const route of routes) {
    fastify.register(route, { prefix: "/game" });
  }

  // setInterval(updateGame, UPDATE_PERIOD);

  return fastify;
}
