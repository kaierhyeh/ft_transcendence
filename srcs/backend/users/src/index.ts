import Fastify from "fastify";
import websocketPlugin from '@fastify/websocket';
import liveSessionManagerPlugin from "./plugins/liveSessionManager";
import dbPlugin from "./plugins/db";
import routes from "./routes";
import { CONFIG } from "./config";

const fastify = Fastify({ logger: true });

async function run() {
  
  await fastify.register(websocketPlugin);
  await fastify.register(dbPlugin);
  await fastify.register(liveSessionManagerPlugin);
  
  for (const route of routes) {
    await fastify.register(route, { prefix: "/game" });
  }
  
  // Use config for update period
  setInterval(() => {
    fastify.sessions.update();
  }, CONFIG.GAME.TICK_PERIOD);
  
  await fastify.listen({ 
    port: CONFIG.SERVER.PORT, 
    host: CONFIG.SERVER.HOST 
  });
}

run().catch(console.error);
