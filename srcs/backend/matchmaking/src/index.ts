import Fastify from "fastify";
import { CONFIG } from "./config";
import jwtPlugin from "./plugins/jwt";
import matchMakingRoutes from "./routes";


const fastify = Fastify({ logger: true });

async function run() {
  await fastify.register(jwtPlugin);
  await fastify.register(matchMakingRoutes, {prefix: "/match"} );
  
  await fastify.listen({ 
    port: CONFIG.SERVER.PORT, 
    host: CONFIG.SERVER.HOST 
  });
}

run().catch(console.error);
