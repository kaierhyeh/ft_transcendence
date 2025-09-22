import Fastify from "fastify";
import { CONFIG } from "./config";
import routes from "./routes"
import repositoriesPlugin from "./plugins/repositories";
import servicesPlugin from "./plugins/services";
import jwtPlugin from "./plugins/jwt"


const fastify = Fastify({ logger: true });

async function run() {
  
  await fastify.register(jwtPlugin);
  await fastify.register(repositoriesPlugin);
  await fastify.register(servicesPlugin);

  for (const { route, prefix } of routes) {
    await fastify.register(route, { prefix });
  }
  
  await fastify.listen({ 
    port: CONFIG.SERVER.PORT, 
    host: CONFIG.SERVER.HOST 
  });
}

run().catch(console.error);
