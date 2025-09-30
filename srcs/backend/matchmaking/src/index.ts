import Fastify from "fastify";
import { CONFIG } from "./config";
import matchMakingRoutes from "./routes";


const fastify = Fastify({ logger: true });

async function run() {

  await fastify.register(matchMakingRoutes, {prefix: "/match"} );

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
