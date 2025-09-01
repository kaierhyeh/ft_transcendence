// src/server/server.ts
import Fastify from "fastify";
import routes from "./routes"; // array of route plugins
import websocketPlugin from '@fastify/websocket';
import { LiveSessionManager } from "../game";

export function createServer() {
  const fastify = Fastify();

  fastify.register(websocketPlugin);

  const live_session_manager = new LiveSessionManager;
  fastify.decorate("live_session_manager", live_session_manager);


  // register all route files
  for (const route of routes) {
    fastify.register(route, { prefix: "/game" });
  }

  setInterval(updateGame, UPDATE_PERIOD);

  return fastify;
}
