// src/server/server.ts
import Fastify from "fastify";
import routes from "./routes"; // array of route plugins
import websocketPlugin from '@fastify/websocket';
import { SocketStream } from '@fastify/websocket';

export function createServer() {
  const fastify = Fastify();

  fastify.register(websocketPlugin);

  // register all route files
  for (const route of routes) {
    fastify.register(route, { prefix: "/game" });
  }

  setInterval(updateGame, UPDATE_PERIOD);

  return fastify;
}
