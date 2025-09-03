import Fastify from "fastify";
import websocketPlugin from '@fastify/websocket';
import liveSessionManagerPlugin from "./plugins/liveSessionManager";
import routes from "./routes";

const fastify = Fastify({ logger: true });

async function run() {
  await fastify.register(websocketPlugin);
  await fastify.register(liveSessionManagerPlugin);
  
  // Register routes in the same context level
  await fastify.register(async function(fastify) {
    for (const route of routes) {
      await fastify.register(route, { prefix: "/game" });
    }
  });
  
  await fastify.ready();
  
  // Start the game loop after everything is ready
  setInterval(() => {
    fastify.sessions.update()
  }, 16); // 60 fps
  
  await fastify.listen({ port: 3000, host: "0.0.0.0" });
}

run().catch(console.error);
