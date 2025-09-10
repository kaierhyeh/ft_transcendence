import Fastify from "fastify";
import websocketPlugin from '@fastify/websocket';
import { CONFIG } from "./config";
import routes from "./routes"
import repositoriesPlugin from "./plugins/repositories";

const fastify = Fastify({ logger: true });

async function run() {
  
  await fastify.register(websocketPlugin);
  await fastify.register(repositoriesPlugin);

  for (const { route, prefix } of routes) {
    await fastify.register(route, { prefix });
  }
  
  await fastify.listen({ 
    port: CONFIG.SERVER.PORT, 
    host: CONFIG.SERVER.HOST 
  });
}

run().catch(console.error);
