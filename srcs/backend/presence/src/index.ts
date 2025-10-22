import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { CONFIG } from "./config";
import presenceRoutes from "./routes/presence.routes"

const fastify = Fastify({ logger: true });

async function run() {

  await fastify.register(cookie);

  await fastify.register(presenceRoutes, { prefix: "/presence" });

  // Health check endpoint
	fastify.get('/health', async (request, reply) => {
		return { status: 'ok', service: 'auth', timestamp: new Date().toISOString() };
	});
  
  await fastify.listen({ 
    port: CONFIG.SERVER.PORT, 
    host: CONFIG.SERVER.HOST 
  });
}

run().catch(console.error);
