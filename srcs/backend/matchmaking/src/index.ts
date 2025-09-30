import Fastify from "fastify";
import { CONFIG } from "./config";
import matchMakingRoutes from "./routes";
import { InternalAuthClient } from "./clients/internal-auth.client";


const fastify = Fastify({ logger: true });

async function run() {
  // Initialize internal auth client (fetch first token)
  const internalAuthClient = new InternalAuthClient();
  try {
    await internalAuthClient.getToken();
    fastify.log.info('✅ Internal auth client initialized');
  } catch (error) {
    fastify.log.error(`❌ Failed to initialize internal auth client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }

  await fastify.register(matchMakingRoutes, {prefix: "/match"} );
  
  await fastify.listen({ 
    port: CONFIG.SERVER.PORT, 
    host: CONFIG.SERVER.HOST 
  });
}

run().catch(console.error);
