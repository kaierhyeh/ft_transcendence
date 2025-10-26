import Fastify from "fastify";
import websocket from "@fastify/websocket";
import cookie from "@fastify/cookie";
import { CONFIG } from "./config";
import presenceRoutes from "./routes/presence.routes"

const fastify = Fastify({ logger: true });

async function run() {

  await fastify.register(websocket);
  await fastify.register(cookie);

  await fastify.register(presenceRoutes, { prefix: "/presence" });

  // Health check endpoint
	fastify.get('/health', async (request, reply) => {
		return { status: 'ok', service: 'presence', timestamp: new Date().toISOString() };
	});
  
  await fastify.listen({ 
    port: CONFIG.SERVER.PORT, 
    host: CONFIG.SERVER.HOST 
  });
}

run().catch(console.error);
