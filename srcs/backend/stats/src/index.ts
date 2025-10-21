import Fastify from "fastify";
import statsRepositoryPlugin from "./plugins/statsRepository";
import routes from "./routes";
import { CONFIG } from "./config";

const fastify = Fastify({ logger: true });

async function run() {
  
  await fastify.register(statsRepositoryPlugin);
  
  for (const { route } of routes) {
    await fastify.register(route, { prefix: "/stats" });
  }
  
  // Health check endpoint
  fastify.get('/health', async () => {
    return { status: 'ok', service: 'stats', timestamp: new Date().toISOString() };
  });
  
  await fastify.listen({ 
    port: CONFIG.SERVER.PORT, 
    host: CONFIG.SERVER.HOST 
  });
}

run().catch(console.error);
