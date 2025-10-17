import Fastify from "fastify";
import { CONFIG } from "./config";
import matchMakingRoutes from "./routes";
import { fastifyErrorHandler } from "./errors";

const fastify = Fastify({ logger: true });

async function run() {
  // Register global error handler FIRST
  fastify.setErrorHandler(fastifyErrorHandler);

  await fastify.register(matchMakingRoutes, {prefix: "/match"} );

  // Health check endpoint
	fastify.get('/health', async (request, reply) => {
		return { status: 'ok', service: 'matchmaking', timestamp: new Date().toISOString() };
	});
  
  await fastify.listen({ 
    port: CONFIG.SERVER.PORT, 
    host: CONFIG.SERVER.HOST 
  });
}

run().catch(console.error);