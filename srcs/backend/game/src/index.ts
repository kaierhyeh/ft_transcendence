import Fastify from "fastify";
import websocketPlugin from '@fastify/websocket';
import liveSessionManagerPlugin from "./plugins/liveSessionManager";
import sessionRepositoryPlugin from "./plugins/sessionRepository";
import routes from "./routes";
import { CONFIG } from "./config";

const fastify = Fastify({ logger: true });

async function run() {
  
  await fastify.register(websocketPlugin);
  await fastify.register(sessionRepositoryPlugin);
  await fastify.register(liveSessionManagerPlugin);
  
  for (const { route } of routes) {
    await fastify.register(route, { prefix: "/game" });
  }
  
  // Health check endpoint
  fastify.get('/health', async () => {
    return { status: 'ok', service: 'game', timestamp: new Date().toISOString() };
  });
  
  // Use config for update period
  setInterval(() => {
    fastify.live_sessions.update();
  }, CONFIG.GAME.TICK_PERIOD);
  
  await fastify.listen({ 
    port: CONFIG.SERVER.PORT, 
    host: CONFIG.SERVER.HOST 
  });
}

run().catch(console.error);
