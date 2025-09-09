import Fastify from "fastify";
import websocketPlugin from '@fastify/websocket';
import dbPlugin from "./plugins/db";
import { CONFIG } from "./config";
import usersRoutes from "./routes/users";
import friendsRoutes from "./routes/friends";
import blocksRoutes from "./routes/blocks";

const fastify = Fastify({ logger: true });

async function run() {
  
  await fastify.register(websocketPlugin);
  await fastify.register(dbPlugin);
  
  await fastify.register(usersRoutes, { prefix: "/users" }); 
  await fastify.register(friendsRoutes, { prefix: "/friends" }); 
  await fastify.register(blocksRoutes, { prefix: "/blocks" }); 
  
  await fastify.listen({ 
    port: CONFIG.SERVER.PORT, 
    host: CONFIG.SERVER.HOST 
  });
}

run().catch(console.error);
